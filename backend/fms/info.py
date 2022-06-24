import os
import subprocess
import datetime
from pathlib import Path

GIT_INFO_NAMES = [
    "COMMIT_DATE",
    "COMMIT_FULL_HASH",
    "COMMIT_SMALL_HASH",
    "COMMIT_TAGGED_VERSION",
    "BRANCH",
]

__all__ = GIT_INFO_NAMES + [
    "CONTACT_EMAIL",
    "COPYRIGHT_YEARS",
    "REPOSITORY",
    "VERSION",
]

GIT_INFO_VALUES = [
    os.environ.get(s, "") for s in GIT_INFO_NAMES
]

if all(GIT_INFO_VALUES):
    COMMIT_DATE, COMMIT_FULL_HASH, COMMIT_SMALL_HASH, COMMIT_TAGGED_VERSION, BRANCH = GIT_INFO_VALUES
else:
    COMMIT_DATE, COMMIT_FULL_HASH, COMMIT_SMALL_HASH = subprocess.run(
        'git show --quiet --format="format:%cI %H %h"',
        shell=True,
        stdout=subprocess.PIPE,
        encoding="UTF-8",
    ).stdout.split(" ")

    COMMIT_TAGGED_VERSION = subprocess.run(
        'git describe --tags',
        shell=True,
        stdout=subprocess.PIPE,
        encoding="UTF-8",
    ).stdout.strip()

    BRANCH = subprocess.run(
        'git branch --show-current',
        shell=True,
        stdout=subprocess.PIPE,
        encoding="UTF-8",
    ).stdout.strip()

CONTACT_EMAIL = "info@computationalgenomics.ca"
COPYRIGHT_YEARS = str(datetime.datetime.now().year)
REPOSITORY = "https://github.com/c3g/freezeman"

VERSION_PATH = Path(__file__).parent.parent / "VERSION"

with open(VERSION_PATH, "r") as vf:
    VERSION = vf.read().strip()
