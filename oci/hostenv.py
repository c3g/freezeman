# Environment of the host scripts (start.py, autoupdate.py, jobs.py) that run podman-compose from cron.
# Python 3.9 compatible: the Rocky 9 system python3 runs it.
import os
import time


def setup() -> None:
    # Rootless podman keeps its state in XDG_RUNTIME_DIR. Cron does not set it, and a guess can point to
    # another directory than the one of the login shells, so the caller must set it.
    runtime_dir = os.environ.get("XDG_RUNTIME_DIR")
    if not runtime_dir:
        raise RuntimeError("XDG_RUNTIME_DIR is not set. Set it in the environment of the script, as in ~/.bash_profile.")
    # At boot, cron can start before logind creates the directory.
    for _ in range(60):
        if os.path.isdir(runtime_dir):
            break
        time.sleep(1)
    else:
        raise RuntimeError(f"XDG_RUNTIME_DIR is {runtime_dir}, but this directory does not exist.")

    # Cron has a short PATH. podman-compose can be in ~/.local/bin.
    os.environ["PATH"] = os.path.expanduser("~/.local/bin") + os.pathsep + os.environ.get("PATH", "")

    # Run in oci/, so that the relative paths of compose.yaml and the commands in .env are the same for each caller.
    os.chdir(os.path.dirname(os.path.abspath(__file__)))


def read_env(path: str) -> dict[str, str]:
    values: dict[str, str] = {}
    if not os.path.isfile(path):
        return values
    with open(path) as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            values[key.strip()] = value
    return values
