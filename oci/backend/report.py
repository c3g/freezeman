#!/usr/bin/env python
import os
import subprocess
import sys

# One prepare_report_data run, then exit with its exit code. Host cron starts it
# every day through oci/jobs.py.


def main() -> int:
    returncode = subprocess.run([sys.executable, f"{os.environ['CONTAINER_FMS_ROOT']}/backend/manage.py", "prepare_report_data"]).returncode
    if returncode != 0:
        # "FAILED:" is the marker that DEPLOYMENT.md greps for.
        print(f"FAILED: prepare_report_data exited with code {returncode}. "
              + "The logs are report_preparation.log and jobs.log in HOST_LOG_DIR.", file=sys.stderr, flush=True)
        return returncode
    print("prepare_report_data finished", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
