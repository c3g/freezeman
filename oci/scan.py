#!/usr/bin/env python3
# Scan the images of the FreezeMan stack for known CVEs (DEPLOYMENT.md: "Scan the images for CVEs").
# It scans the image of each container of the stack with Trivy (a throwaway podman container). If Trivy finds
# HIGH or CRITICAL CVEs that a newer package fixes, it emails the list through notify.send_alert.
#   scan.py [--interval 86400]
# Without --interval it scans once and exits (cron). With it, it scans every N seconds and never exits.
# Exit code: 0 after a scan, also when it finds CVEs. 1 if the script fails (podman or Trivy error).
# Python 3.9 compatible: the Rocky 9 system python3 runs it.
import argparse
import fcntl
import json
import os
import shutil
import subprocess
import sys
import time
import traceback
from collections.abc import Mapping
from datetime import datetime
from typing import Optional, cast

import hostenv
import notify

# Pinned, so a new Trivy release cannot change the output by itself. FMS_TRIVY_IMAGE overrides it.
TRIVY_IMAGE = "docker.io/aquasec/trivy:0.76.1"
TRIVY_CACHE_VOLUME = "freezeman-trivy-cache"
COMPOSE_PROJECT = "freezeman"
TRIVY_TIMEOUT_SECONDS = 1800
# Lines of CVEs in the email. The log has all of them.
MAX_EMAIL_LINES = 200
SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1}
PROXY_NAMES = ("HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY")


class Abort(Exception):
    pass


class Args(argparse.Namespace):
    # Same defaults as the parser in main(). The parser sets each attribute again.
    def __init__(self) -> None:
        super().__init__()
        self.interval: Optional[int] = None


class Finding:
    def __init__(self, vulnerability: Mapping[str, object]) -> None:
        self.severity: str = str(vulnerability.get("Severity", "UNKNOWN"))
        self.cve: str = str(vulnerability.get("VulnerabilityID", "?"))
        self.package: str = str(vulnerability.get("PkgName", "?"))
        self.installed: str = str(vulnerability.get("InstalledVersion", "?"))
        self.fixed: str = str(vulnerability.get("FixedVersion", "?"))
        self.title: str = str(vulnerability.get("Title", "")).strip()

    def key(self) -> tuple[str, str, str]:
        return (self.cve, self.package, self.installed)

    def line(self) -> str:
        text = f"{self.severity:<8} {self.cve}  {self.package} {self.installed} -> {self.fixed}"
        return f"{text}  {self.title}" if self.title else text


class ScannedImage:
    def __init__(self, image_id: str, names: list[str], containers: list[str]) -> None:
        self.image_id: str = image_id
        self.names: list[str] = names
        self.containers: list[str] = containers
        self.findings: list[Finding] = []

    def label(self) -> str:
        return f"{self.image_id} ({', '.join(self.names)}; containers: {', '.join(self.containers)})"


def log(message: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}", flush=True)


def log_directory(env: Mapping[str, str]) -> str:
    return os.environ.get("FMS_LOG_DIR") or env.get("FMS_LOG_DIR") or os.path.join(OCI_DIR, "logs")


def clear_alert(log_dir: str) -> None:
    try:
        os.remove(os.path.join(log_dir, "scan.alert"))
    except FileNotFoundError:
        pass


def alert_failure(error: BaseException) -> None:
    """Send one email per distinct error. logs/scan.alert holds the last error that was sent.

    Without it, a failure would send an email at each run (every --interval seconds or cron run).
    """
    if isinstance(error, (Abort, subprocess.CalledProcessError)):
        text = f"{type(error).__name__}: {error}"
    else:
        text = "".join(traceback.format_exception(type(error), error, error.__traceback__))
    try:
        settings = hostenv.settings()
        alert_path = os.path.join(log_directory(settings), "scan.alert")
        try:
            with open(alert_path) as alert_file:
                if alert_file.read() == text:
                    return
        except OSError:
            pass
        body = f"scan.py failed.\n\nError: {text}\n"
        output = getattr(error, "output", None) or getattr(error, "stderr", None)
        if output:
            body += f"\nLast output:\n{output}\n"
        body += "\nThe images were not scanned. See logs/scan.log. No other email follows for the same error."
        notify.send_alert("scan.py failed", body, settings)
        os.makedirs(os.path.dirname(alert_path), exist_ok=True)
        with open(alert_path, "w") as alert_file:
            _ = alert_file.write(text)
    except Exception as alert_error:
        print(f"Alert failed: {alert_error}", file=sys.stderr, flush=True)


def stack_images() -> list[ScannedImage]:
    """The images of the containers of the stack (also the stopped ones), grouped by image ID."""
    result = subprocess.run(
        ["podman", "ps", "-a", "--filter", f"label=io.podman.compose.project={COMPOSE_PROJECT}", "--format", "{{.ImageID}} {{.Image}} {{.Names}}"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise Abort(f"podman ps failed: {result.stderr.strip()}")
    images: dict[str, ScannedImage] = {}
    for line in result.stdout.splitlines():
        parts = line.split(None, 2)
        if len(parts) != 3:
            continue
        image_id, name, container = parts
        image = images.setdefault(image_id, ScannedImage(image_id, [], []))
        if name not in image.names:
            image.names.append(name)
        image.containers.append(container)
    return list(images.values())


def trivy_environment(env: Mapping[str, str]) -> dict[str, str]:
    """The process environment with the proxy values of the settings (.env and shell).

    `podman run -e NAME` reads the value from it, so a password in a proxy URL stays out of the command line.
    """
    process_env = dict(os.environ)
    for name in PROXY_NAMES:
        value = env.get(name) or env.get(name.lower()) or ""
        if value:
            process_env[name] = value
    return process_env


def scan_image(image: ScannedImage, trivy_image: str, scan_dir: str, env: Mapping[str, str]) -> None:
    archive = os.path.join(scan_dir, "image.tar")
    process_env = trivy_environment(env)
    try:
        save = subprocess.run(["podman", "save", "--format", "docker-archive", "-o", archive, image.image_id], capture_output=True, text=True, check=False)
        if save.returncode != 0:
            raise Abort(f"podman save {image.image_id} failed: {save.stderr.strip()}")
        command = ["podman", "run", "--rm", "-v", f"{scan_dir}:/scan:ro,z", "-v", f"{TRIVY_CACHE_VOLUME}:/root/.cache/trivy:z"]
        for name in PROXY_NAMES:
            if name in process_env:
                command += ["-e", name]
        command += [trivy_image, "image", "--input", "/scan/image.tar", "--scanners", "vuln", "--severity", "HIGH,CRITICAL", "--ignore-unfixed", "--format", "json", "--quiet"]
        try:
            trivy = subprocess.run(command, capture_output=True, text=True, check=False, env=process_env, timeout=TRIVY_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            raise Abort(f"Trivy did not finish in {TRIVY_TIMEOUT_SECONDS} s for {image.image_id}")
        if trivy.returncode != 0:
            raise Abort(f"Trivy failed for {image.image_id} (exit code {trivy.returncode}): {trivy.stderr.strip()[-2000:]}")
        image.findings = parse_findings(trivy.stdout, image.image_id)
    finally:
        try:
            os.remove(archive)
        except FileNotFoundError:
            pass


def parse_findings(output: str, image_id: str) -> list[Finding]:
    try:
        report = cast("dict[str, object]", json.loads(output))
    except ValueError as error:
        raise Abort(f"Trivy printed no valid JSON for {image_id}: {error}")
    findings: dict[tuple[str, str, str], Finding] = {}
    for result in cast("list[dict[str, object]]", report.get("Results") or []):
        for vulnerability in cast("list[dict[str, object]]", result.get("Vulnerabilities") or []):
            finding = Finding(vulnerability)
            _ = findings.setdefault(finding.key(), finding)
    return sorted(findings.values(), key=lambda item: (SEVERITY_ORDER.get(item.severity, 9), item.cve, item.package))


def alert_findings(images: list[ScannedImage], settings: Mapping[str, str]) -> None:
    total = sum(len(image.findings) for image in images)
    lines: list[str] = []
    for image in images:
        if not image.findings:
            continue
        lines.append(f"Image {image.label()}: {len(image.findings)} CVEs")
        lines.extend(f"  {finding.line()}" for finding in image.findings)
        lines.append("")
    left_out = max(0, len(lines) - MAX_EMAIL_LINES)
    body = "Trivy found HIGH or CRITICAL CVEs that a newer package fixes.\n\n" + "\n".join(lines[:MAX_EMAIL_LINES])
    if left_out:
        body += f"\n... {left_out} more lines left out. See logs/scan.log.\n"
    body += (
        "\nTo fix them, rebuild the images and recreate the containers (oci/README.md, \"Keep the base images up to date\"):\n"
        "  podman-compose build --pull --no-cache\n"
        "  podman-compose up -d\n"
    )
    notify.send_alert(f"Image scan: {total} fixable HIGH/CRITICAL CVEs", body, settings)


def scan_once() -> None:
    hostenv.setup()
    settings = hostenv.settings()
    log_dir = log_directory(settings)
    os.makedirs(log_dir, exist_ok=True)

    with open(os.path.join(log_dir, "scan.lock"), "w") as lock_file:
        try:
            fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            log("Another run holds the lock. Exit.")
            return

        images = stack_images()
        if not images:
            log("No containers in the project. Nothing to scan.")
            clear_alert(log_dir)
            return

        trivy_image = settings.get("FMS_TRIVY_IMAGE") or TRIVY_IMAGE
        # On the data disk, not in /tmp: an image archive can be some GB.
        scan_dir = os.path.join(OCI_DIR, ".scan-tmp")
        shutil.rmtree(scan_dir, ignore_errors=True)
        os.makedirs(scan_dir)
        try:
            for image in images:
                log(f"Scan {image.label()}")
                scan_image(image, trivy_image, scan_dir, settings)
                log(f"  {len(image.findings)} fixable HIGH/CRITICAL CVEs")
                for finding in image.findings:
                    log(f"    {finding.line()}")
        finally:
            shutil.rmtree(scan_dir, ignore_errors=True)

        if any(image.findings for image in images):
            alert_findings(images, settings)
        clear_alert(log_dir)


def report_failure(error: BaseException) -> None:
    if isinstance(error, (Abort, subprocess.CalledProcessError)):
        print(f"Scan failed: {error}", file=sys.stderr, flush=True)
    else:
        traceback.print_exception(type(error), error, error.__traceback__)
    alert_failure(error)


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan the images of the FreezeMan stack with Trivy and email the fixable HIGH/CRITICAL CVEs.")
    _ = parser.add_argument("--interval", type=int, help="scan every N seconds and never exit (default: scan once)")
    args = parser.parse_args(namespace=Args())

    if args.interval is None:
        try:
            scan_once()
        except Exception as error:
            report_failure(error)
            sys.exit(1)
        return
    while True:
        try:
            scan_once()
        except Exception as error:
            report_failure(error)
        time.sleep(args.interval)


OCI_DIR = os.path.dirname(os.path.abspath(__file__))

if __name__ == "__main__":
    main()
