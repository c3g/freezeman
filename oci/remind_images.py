#!/usr/bin/env python3
# Email the monthly reminder to update the base images. Run it from cron (DEPLOYMENT.md, "Remind the image updates").
# Python 3.9 compatible and standard library only: the Rocky 9 system python3 runs it.
import sys

import hostenv
import notify

BODY = """Update the base images of the FreezeMan stack (python, node, nginx, postgres, Debian, Alpine).
The Containerfiles use floating tags, and this host keeps the images it pulled first.

Steps (in oci/, as the user that runs the stack, QC first and then prod):

1. podman-compose build --pull --no-cache
2. podman-compose up -d
3. Check the containers and the web page.

Details: "Keep the base images up to date" in oci/README.md."""


def main() -> int:
    hostenv.setup()
    notify.send_alert("Monthly reminder: update the base images", BODY, hostenv.settings())
    return 0


if __name__ == "__main__":
    sys.exit(main())
