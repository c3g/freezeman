#!/usr/bin/env python
import subprocess
import sys

# One prepare_report_data run, then exit with its exit code. Host cron starts it
# every day through oci/jobs.py, before fms-backup.


def main() -> int:
    returncode = subprocess.run([sys.executable, "/workspace/freezeman/backend/manage.py", "prepare_report_data"]).returncode
    if returncode != 0:
        # "FAILED:" is the marker that DEPLOYMENT.md greps for.
        print(f"FAILED: prepare_report_data exited with code {returncode}. "
              + "The logs are report_preparation.log and jobs.log in FMS_LOG_DIR.", file=sys.stderr, flush=True)
        return returncode
    print("prepare_report_data finished", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
