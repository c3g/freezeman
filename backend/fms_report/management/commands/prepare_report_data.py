from django.core.management.base import BaseCommand
from django.db import transaction
from os.path import expanduser
import os
import time
import platform
import logging

from fms_report.services.report_data_preparation import prepare_production_report_data

# This report preparation module can be called using manage.py :
# > python manage.py prepare_report_data

# constants
HOME = expanduser("~")
# The containers set FMS_LOG_DIR to the mount of HOST_LOG_DIR, so this log stays next to fms.log.
LOG_DIR = os.environ.get("FMS_LOG_DIR") or os.path.join(HOME, "reports", "log")
LOG_NAME = "report_preparation"
SERVER_PLATFORM = "Linux"  # Platform for the server
SERVER_TZ = "America/Montreal"  # Local timezone

class Command(BaseCommand):
    help = 'Prepare report data'

    def init_logging(self, log_name, timestamp):
        if not os.path.exists(LOG_DIR):
            os.makedirs(LOG_DIR)
        filename = os.path.join(LOG_DIR, log_name + ".log")
        formatter = logging.Formatter("%(asctime)s || %(levelname)s || %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
        handler = logging.FileHandler(filename, "a+")
        handler.setFormatter(formatter)
        log = logging.getLogger(log_name)
        log.setLevel(logging.DEBUG)
        log.addHandler(handler)
        return log

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Started report data preparation job."))
        if platform.system() == SERVER_PLATFORM:
            os.environ["TZ"] = SERVER_TZ
            time.tzset()
        timestamp = time.strftime("%Y-%m-%d-%H-%M-%S")
        if not os.path.exists(LOG_DIR):
            os.makedirs(LOG_DIR)
        
        log = self.init_logging(LOG_NAME, timestamp)
        # log info identifying the current execution
        log.info(" ===================== New report data preparation started [" + timestamp + "] ===================== ")
       
        try:
            with transaction.atomic():   
                self.stdout.write(self.style.SUCCESS("Launching production report data preparation."))
                log.info("Launching production report data preparation.")

                prepare_production_report_data(log)
                
                self.stdout.write(self.style.SUCCESS("Completed production report data preparation."))
                log.info("Completed production report data preparation.")

                self.stdout.write(self.style.SUCCESS("Completed report data preparation."))
                log.info(" ===================== Completed report data preparation ===================== ")
        except Exception as err:
            self.stdout.write(self.style.ERROR("Report preparation interrupted. Transaction rolled back."))
            log.info("Report preparation transaction rolled back.")


