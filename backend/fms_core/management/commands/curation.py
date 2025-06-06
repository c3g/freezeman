from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, IntegrityError
import json
from os.path import expanduser
import os
import time
import platform
import datetime
import logging
import reversion
from shutil import copyfile
from django.contrib.auth.models import User
# Import the functions of the various curations available.
from ._update_field_value import update_field_value
from ._update_index import update_index
from ._delete_individual import delete_individual
from ._delete_container import delete_container
from ._delete_sample import delete_sample
from ._delete_datasetfile import delete_datasetfile
from ._create_entity import create_entity

# This curation module can be called using manage.py :
# > python manage.py curation -p NameOfConfigFileWithoutExtension

# The config file must be located in /home/USERNAME/curation/
# log files are generated in /home/USERNAME/curation/log/

# Available actions
ACTION_UPDATE_FIELD_VALUE = "update_field_value"
ACTION_UPDATE_INDEX = "update_index"
ACTION_DELETE_INDIVIDUAL = "delete_individual"
ACTION_DELETE_CONTAINER = "delete_container"
ACTION_DELETE_SAMPLE = "delete_sample"
ACTION_DELETE_DATASETFILE = "delete_datasetfile"
ACTION_CREATE_ENTITY = "create_entity"

# Curation params template
# [CURATION_ACTION_TEMPLATE_1,CURATION_ACTION_TEMPLATE_2,...]

# Other contants
HOME = expanduser("~")
CURATION_PATH = "/curation/"
LOG_PATH = "log/"
SERVER_PLATFORM = "Linux"  # Platform for the server
SERVER_TZ = "America/Montreal"  # Local timezone
REVERSION_ADMIN_USER = "biobankadmin"


class Command(BaseCommand):
    help = 'Manage curations'

    curation_switch = {
        ACTION_UPDATE_FIELD_VALUE: update_field_value,
        ACTION_UPDATE_INDEX: update_index,
        ACTION_DELETE_INDIVIDUAL: delete_individual,
        ACTION_DELETE_CONTAINER: delete_container,
        ACTION_DELETE_SAMPLE: delete_sample,
        ACTION_DELETE_DATASETFILE: delete_datasetfile,
        ACTION_CREATE_ENTITY: create_entity,
    }

    def init_logging(self, log_name, timestamp):
        path = HOME + CURATION_PATH + LOG_PATH
        if not os.path.exists(path):
            os.makedirs(path)
        filename = path + timestamp + "_" + log_name + ".log"
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
        if platform.system() == SERVER_PLATFORM:
            os.environ["TZ"] = SERVER_TZ
            time.tzset()
        # Copy the curation file to log directory with current timestamp matching log file
        timestamp = time.strftime("%Y-%m-%d-%H-%M-%S")
        src_path = HOME + CURATION_PATH
        dst_path = HOME + CURATION_PATH + LOG_PATH
        if not os.path.exists(dst_path):
            os.makedirs(dst_path)
        src_curation_file = src_path + options["params_file"] + ".json"
        dst_curation_file = dst_path + timestamp + "_" + options["params_file"] + ".json"
        if not os.path.exists(src_curation_file):
            self.stdout.write(self.style.ERROR("Parameter file absent from the path : " + src_curation_file))
        else:
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
                    # Launch each individual curation
                    for curation in params:
                        objects_to_delete = []
                        # Create a curation revision to eventually rollback the current curation
                        with reversion.create_revision():
                            self.stdout.write(self.style.SUCCESS('Launching action [' + str(curation["curation_index"]) + '] "%s"' % curation["action"]) + '.')
                            action = self.curation_switch.get(curation["action"])
                            if action:
                                curation_failed = action(curation, objects_to_delete, log)
                                if curation_failed is not None:
                                    self.stdout.write(self.style.ERROR("Action [" + str(curation_failed) + "] failed."))
                                    error_found = True
                                else:
                                    self.stdout.write(self.style.SUCCESS("Action complete."))
                            else:
                                self.stdout.write(self.style.ERROR("Curation [" + str(curation["action"]) + "] do not exist."))
                            reversion.set_user(User.objects.get(username=REVERSION_ADMIN_USER))  # set admin user as creator for revision
                            reversion.set_comment("Manual curation performed by Administrators.")
                        if error_found:
                            raise IntegrityError
                        else:
                            # Operate the deletions here instead of inside the revision scope so objects get a version even when deleted
                            with reversion.create_revision(manage_manually=True):  # Shadowing the revision blocks for deletes to prevent them
                                for object in objects_to_delete:
                                    log.info(f"Completing deletion of object {object.__class__.__name__} id [{object.id}].")
                                    object.delete()
                    self.stdout.write(self.style.SUCCESS("Completed curation."))
            except IntegrityError:
                log.info("Curation operation transaction rolled back.")
                self.stdout.write(self.style.ERROR("Curation interrupted. Transaction rolled back."))


