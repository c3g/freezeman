# Failure emails of the oci/ jobs (start.py, autoupdate.py, backup.py, report.py).
# Python 3.9 compatible and standard library only: the Rocky 9 system python3 runs it on the host,
# and the backup and backend images copy it next to their script.
import os
import smtplib
import socket
import subprocess
import sys
from collections import deque
from collections.abc import Mapping
from datetime import datetime
from email.message import EmailMessage
from typing import IO, Optional

SMTP_TIMEOUT = 30


def _setting(env: Mapping[str, str], name: str, default: str = "") -> str:
    return (env.get(name) or default).strip()


def send_alert(subject: str, body: str, env: Optional[Mapping[str, str]] = None) -> None:
    """Email the FMS_ALERT_EMAILS recipients. Never raises: a failed alert must not stop the job.

    env is a dict of settings. If it is None, os.environ is used. The SMTP settings are the ones
    of Django (FMS_EMAIL_*). If FMS_EMAIL_HOST or FMS_ALERT_EMAILS is empty, the alert only goes to stderr.
    """
    try:
        _send(subject, body, os.environ if env is None else env)
    except Exception as error:
        print(f"Alert email failed: {error}", file=sys.stderr, flush=True)


def _send(subject: str, body: str, env: Mapping[str, str]) -> None:
    host = _setting(env, "FMS_EMAIL_HOST")
    recipients = [address.strip() for address in _setting(env, "FMS_ALERT_EMAILS").split(",") if address.strip()]
    full_subject = f"[FreezeMan {_setting(env, 'FMS_ENV')} {_setting(env, 'FMS_HOST')}] {subject}".replace("  ", " ")
    text = f"{body}\n\nHost: {socket.gethostname()}\nTime: {datetime.now().astimezone():%Y-%m-%d %H:%M:%S %Z}\n"

    if not host or not recipients:
        print(f"Alert email disabled (FMS_EMAIL_HOST or FMS_ALERT_EMAILS is empty). Alert: {full_subject}", file=sys.stderr, flush=True)
        return

    user = _setting(env, "FMS_EMAIL_USER")
    password = env.get("FMS_EMAIL_PASSWORD") or ""
    message = EmailMessage()
    message["Subject"] = full_subject
    message["From"] = _setting(env, "FMS_EMAIL_FROM") or user or f"freezeman@{socket.gethostname()}"
    message["To"] = ", ".join(recipients)
    message.set_content(text)

    with smtplib.SMTP(host, int(_setting(env, "FMS_EMAIL_PORT", "587")), timeout=SMTP_TIMEOUT) as smtp:
        # Same rule as EMAIL_USE_TLS in backend/fms/settings.py: any non-empty value (even "False") enables TLS,
        # unless FMS_DEBUG is true. A missing FMS_DEBUG is true, an empty one is false.
        debug = _setting(env, "FMS_DEBUG", "True" if "FMS_DEBUG" not in env else "").lower() == "true"
        if not debug and _setting(env, "FMS_EMAIL_TLS"):
            _ = smtp.starttls()
        if user and password:
            _ = smtp.login(user, password)
        _ = smtp.send_message(message)
    print(f"Alert email sent to {', '.join(recipients)}: {full_subject}", flush=True)


def run_tail(command: list[str], lines: int = 50) -> tuple[int, str]:
    """Run a command and echo its output (stdout and stderr) to stdout, so the logs stay as before.

    Return (returncode, the last `lines` lines of the output).
    """
    tail: deque[str] = deque(maxlen=lines)
    with subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace") as process:
        assert process.stdout is not None
        # typeshed types Popen.stdout as IO[Any]. text=True makes it IO[str].
        output: IO[str] = process.stdout
        for line in output:
            print(line, end="", flush=True)
            tail.append(line)
        returncode = process.wait()
    return returncode, "".join(tail)
