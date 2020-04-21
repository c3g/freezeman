import subprocess
from pathlib import Path

__all__ = [
    "COMMIT_DATE",
    "COMMIT_HASH",
    "COMMIT_TAGGED_VERSION",
    "CONTACT_EMAIL",
    "COPYRIGHT_YEARS",
    "REPOSITORY",
    "VERSION",
]

COMMIT_DATE, COMMIT_HASH = subprocess.run(
    'git show --format="format:%cI %h"',
    shell=True,
    capture_output=True,
    encoding="UTF-8",
).stdout.split(" ")

COMMIT_TAGGED_VERSION = subprocess.run(
    'git describe --tags',
    shell=True,
    capture_output=True,
    encoding="UTF-8",
).stdout

CONTACT_EMAIL = "info@computationalgenomics.ca"
COPYRIGHT_YEARS = "2020"
REPOSITORY = "https://github.com/c3g/fms.git"

VERSION_PATH = Path(__file__).parent.parent / "VERSION"

with open(VERSION_PATH, "r") as vf:
    VERSION = vf.read().strip()
