#!/usr/bin/env python
import sys

import notify

# One prepare_report_data run, then exit with its exit code. The `scheduler` service
# (oci/scheduler/scheduler.py) starts it every day at FMS_JOBS_TIME, before fms-backup. In
# Kubernetes a CronJob can call it too.
#   fms-report now    run once and exit (`now` is the only mode, the argument is optional)


def run_and_alert() -> bool:
    returncode, tail = notify.run_tail([sys.executable, "manage.py", "prepare_report_data"])
    if returncode != 0:
        print("prepare_report_data failed", file=sys.stderr, flush=True)
        notify.send_alert(
            "Report data failed",
            f"prepare_report_data exited with code {returncode}.\n\nLast output:\n{tail}\n"
            + "The logs are report_preparation.log and scheduler.log in FMS_LOG_DIR.",
        )
        return False
    print("prepare_report_data finished", flush=True)
    return True


sys.exit(0 if run_and_alert() else 1)
