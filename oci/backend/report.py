#!/usr/bin/env python
import subprocess
import sys

# One prepare_report_data run, then exit with its exit code. Host cron starts it
# every day through oci/jobs.py, before fms-backup. In
# Kubernetes a CronJob can call it too.
#   fms-report now    run once and exit (`now` is the only mode, the argument is optional)


def run_and_alert() -> bool:
    returncode = subprocess.run([sys.executable, "manage.py", "prepare_report_data"]).returncode
    if returncode != 0:
        # "FAILED:" is the marker that DEPLOYMENT.md greps for.
        print(f"FAILED: prepare_report_data exited with code {returncode}. "
              + "The logs are report_preparation.log and jobs.log in FMS_LOG_DIR.", file=sys.stderr, flush=True)
        return False
    print("prepare_report_data finished", flush=True)
    return True


sys.exit(0 if run_and_alert() else 1)
