#!/usr/bin/env python3
# Start the stack. Run it from cron: `@reboot /data/freezeman/oci/start.py` (README.md).
# Python 3.9 compatible: the Rocky 9 system python3 runs it.
import os

import hostenv

hostenv.setup()
os.execvp("podman-compose", ["podman-compose", "up", "-d"])
