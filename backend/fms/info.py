import json
import subprocess
import datetime
from pathlib import Path
from typing import cast

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

# The `build-info` stage of oci/Containerfile writes the commit info to this file at build time, and the
# prod image (`backend-prod`) reads it. A git call at runtime is not worth adding to that image:
# - The image has no `.git` and no git binary. Both add size: `.git` is about 60 MB in a full clone
#   (end of 2026), and it also puts the full history in the image.
# - The file records the commit that the image was built from. A git call at runtime describes the
#   repository that is present at that time, if there is one.
# - Without git, `_git` fails silently (empty stdout), so the software information API returns empty
#   commit fields.
# Outside the prod image (local run, classic deployment, `dev` image with the bind-mounted `.git`), the
# file does not exist and the values come from git.
BUILD_INFO_PATH = Path(__file__).parent / "build_info.json"


def _git(command: str) -> str:
    """
    Run a git command in a shell and return its stripped output.

    Args:
        `command`: The git command line, for example `git show --quiet --format=%H`.

    Returns:
        The standard output of the command, without surrounding whitespace. Empty if git fails.
    """
    return subprocess.run(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        encoding="UTF-8",
    ).stdout.strip()


build_info: dict[str, str]
if BUILD_INFO_PATH.exists():
    with open(BUILD_INFO_PATH, "r") as bf:
        # The `build-info` stage writes only string values.
        build_info = cast(dict[str, str], json.load(bf))
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
