import json
import subprocess
import datetime
from pathlib import Path

__all__ = [
    "COMMIT_DATE",
    "COMMIT_FULL_HASH",
    "COMMIT_SMALL_HASH",
    "COMMIT_TAGGED_VERSION",
    "BRANCH",
    "CONTACT_EMAIL",
    "COPYRIGHT_YEARS",
    "REPOSITORY",
    "VERSION",
]

# Container images have no git repository; docker/Containerfile writes the commit info to this file instead.
BUILD_INFO_PATH = Path(__file__).parent / "build_info.json"


def _git(command):
    return subprocess.run(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        encoding="UTF-8",
    ).stdout.strip()


if BUILD_INFO_PATH.exists():
    with open(BUILD_INFO_PATH, "r") as bf:
        build_info = json.load(bf)
else:
    build_info = {
        "commit_date": _git("git show --quiet --format=%cI"),
        "commit_full_hash": _git("git show --quiet --format=%H"),
        "commit_small_hash": _git("git show --quiet --format=%h"),
        "commit_tagged_version": _git("git describe --tags"),
        "branch": _git("git branch --show-current"),
    }

COMMIT_DATE = build_info["commit_date"]
COMMIT_FULL_HASH = build_info["commit_full_hash"]
COMMIT_SMALL_HASH = build_info["commit_small_hash"]
COMMIT_TAGGED_VERSION = build_info["commit_tagged_version"]
BRANCH = build_info["branch"]

CONTACT_EMAIL = "info@computationalgenomics.ca"
COPYRIGHT_YEARS = str(datetime.datetime.now().year)
REPOSITORY = "https://github.com/c3g/freezeman"

VERSION_PATH = Path(__file__).parent.parent.parent / "VERSION"

with open(VERSION_PATH, "r") as vf:
    VERSION = vf.read().strip()
