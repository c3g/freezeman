# Environment of the host scripts (start.py, autoupdate.py) that run podman-compose from cron.
# Python 3.9 compatible: the Rocky 9 system python3 runs it.
import getpass
import os
import time


def setup() -> None:
    if not os.environ.get("XDG_RUNTIME_DIR"):
        # Rootless podman keeps its state in XDG_RUNTIME_DIR. Cron does not set it, so use the same rule
        # as ~/.bash_profile: all shells of the user then see the same containers.
        runtime_dir = f"/run/user/{os.getuid()}"
        # At boot, cron can start before logind creates the directory. Wait only if the user has linger:
        # logind then creates the directory without a login.
        if os.path.exists(f"/var/lib/systemd/linger/{getpass.getuser()}"):
            for _ in range(60):
                if os.path.isdir(runtime_dir):
                    break
                time.sleep(1)
        if os.path.isdir(runtime_dir):
            os.environ["XDG_RUNTIME_DIR"] = runtime_dir

    # Cron has a short PATH. podman-compose can be in ~/.local/bin.
    os.environ["PATH"] = os.path.expanduser("~/.local/bin") + os.pathsep + os.environ.get("PATH", "")

    # podman-compose reads .env and the relative paths of compose.yaml from the current directory.
    # compose.yaml builds the default log path from PWD, so set it.
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    os.environ["PWD"] = os.getcwd()


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


def settings() -> dict[str, str]:
    # The shell wins over .env, as in compose.
    values = read_env(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
    values.update(os.environ)
    return values
