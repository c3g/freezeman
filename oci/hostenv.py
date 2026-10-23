# Environment of the host scripts (start.py, autoupdate.py) that run podman-compose from cron.
# Python 3.9 compatible: the Rocky 9 system python3 runs it.
import getpass
import os
import time


def setup():
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
