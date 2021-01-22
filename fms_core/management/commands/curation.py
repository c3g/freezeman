from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
import json
from os.path import expanduser
import os
import time
import datetime
import logging
import reversion
from shutil import copyfile
from django.contrib.auth.models import User
# Import the functions of the various curations available.
from ._rollback_extraction import rollback_extraction
from ._rollback_curation import rollback_curation

# Available actions
ACTION_ROLLBACK_CURATION = "rollback_curation"
ACTION_ROLLBACK_EXTRACTION = "rollback_extraction"

# Curation params template
# [CURATION_ACTION_TEMPLATE_1,CURATION_ACTION_TEMPLATE_2,...]

# Other contants
HOME = expanduser("~")
CURATION_PATH = "/curation/"
LOG_PATH = "log/"


class Command(BaseCommand):
    help = 'Manage curations'

    curation_switch = {
        ACTION_ROLLBACK_EXTRACTION: rollback_extraction,
        ACTION_ROLLBACK_CURATION: rollback_curation
    }

    def init_logging(self, log_name, timestamp):
        filename = HOME + CURATION_PATH + LOG_PATH + log_name + "_" + timestamp + ".log"
        formatter = logging.Formatter("%(asctime)s || %(levelname)s || %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
        handler = logging.FileHandler(filename, "w+")
        handler.setFormatter(formatter)
        log = logging.getLogger(log_name)
        log.setLevel(logging.DEBUG)
        log.addHandler(handler)
        return log

    def add_arguments(self, parser):
        parser.add_argument("-p", dest="params_file", help="curation parameters file (json format)", required=True)

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Started curation."))
        # Copy the curation file to log directory with current timestamp matching log file
        os.environ["TZ"] = "America/Montreal"
        time.tzset()
        timestamp = time.strftime("%Y-%m-%d_%H:%M:%S")
        src_curation_file = HOME + CURATION_PATH + options["params_file"] + ".json"
        dst_curation_file = HOME + CURATION_PATH + LOG_PATH + options["params_file"] + "_" + timestamp + ".json"
        copyfile(src_curation_file, dst_curation_file)
        # Use param file name to name log file
        log = self.init_logging(options["params_file"], timestamp)
        # log info identifying the curation
        log.info("New curation started using identifier [" + options["params_file"] + "].")
        # Extracting the curations to perform from file
        with open(src_curation_file) as file:
            params = json.load(file)
        error_found = False
        try:
            with transaction.atomic():
                # Create a curation revision to eventually rollback the current curation
                with reversion.create_revision():
                    # Launch each individual curation
                    for curation in params:
                        self.stdout.write(self.style.SUCCESS('Launching action [' + str(curation["curation_index"]) + '] "%s"' % curation["action"]) + '.')
                        action = self.curation_switch.get(curation["action"])
                        if action:
                            curation_failed = action(curation, log)
                            if curation_failed:
                                self.stdout.write(self.style.ERROR("Action [" + str(curation_failed) + "] failed."))
                                error_found = True
                            else:
                                self.stdout.write(self.style.SUCCESS("Action complete."))
                        else:
                            self.stdout.write(self.style.ERROR("Curation [" + str(curation["action"]) + "] do not exist."))
                    reversion.set_user(User.objects.get(username="biobankadmin"))  # set biobankadmin (user 1) as user
                    reversion.set_comment("Manual curation performed by Administrators.")
                if error_found:
                    raise IntegrityError
                else:
                    self.stdout.write(self.style.SUCCESS("Completed curation."))
        except IntegrityError:
            log.info("Curation operation transaction rolled back.")


