from ._generic import GenericAutomation
from os import path, makedirs
from fms.settings import FMS_AUTOMATIONS_WORK_PATH
from typing import List
from fms_core.models import Container, Sample
from collections import defaultdict
from pandas import DataFrame
import csv
from fms_core.template_importer._constants import DESTINATION_CONTAINER_BARCODE_MARKER


WORK_FOLDER = "axiom-arrays"
FILE_SUFFIX = ".PROJECT"
REMOVED_CONTAINER_SUFFIX = "_AFHD"

class AxiomCreateFolders(GenericAutomation):
    
    work_folder = path.join(FMS_AUTOMATIONS_WORK_PATH, WORK_FOLDER)
  
    def __init__(self):
        super().__init__()

    @classmethod
    def execute(self, sample_ids: List, additional_data: dict):
        """
        Execute the AxiomCreateFolders automation to create folders and files for the genotyping scanner outputs.
        The name used for the folder and file created inside are based on the container name and id of the samples listed.

        Args:
        `sample_ids`: A list of samples that are ready for the Axiom experiment run.
        `additional_data`: A dictionnary that maps a source container name to a destination array barcode.

        Returns:
        A tuple containing None (no result), errors and warnings encountered during execution.
        
        """
        errors = defaultdict(list)
        warnings = defaultdict(list)
        # build list of folder from sample plate info
        for container in Container.objects.filter(samples__id__in=sample_ids).all().distinct():
            project = container.name.replace(REMOVED_CONTAINER_SUFFIX, "") + "_" + str(container.id)
            filepath = path.join(self.work_folder, project)
            df = DataFrame(columns=["Coordinates", "Array Barcode", "Unique Sample ID", "Unique Sample ID Duplicate"])
            for i, sample in enumerate(Sample.objects.filter(id__in=sample_ids).filter(container_id__exact=container.id).order_by("coordinate__row", "coordinate__column").all()):
                unique_sample_id = sample.name + "_" + str(sample.id)
                df.loc[i] = [sample.coordinates, additional_data[container.name], unique_sample_id, unique_sample_id]
            # Create directory if it doesn't already exist
            try:
                makedirs(filepath)
            except FileExistsError:
                pass
            # Create file if it doesn't already exist
            with open(path.join(filepath, project + FILE_SUFFIX), "w") as fp:
                fp.write(project)
            # Write csv file with sample info into directory
            df.to_csv(path.join(filepath, project + ".csv"), header=False, index=False, quoting=csv.QUOTE_NONNUMERIC)
            # Add a comment to the container to provide a reference for validation during experiment run.
            container.comment = DESTINATION_CONTAINER_BARCODE_MARKER + additional_data[container.name] + " ." + container.comment
            container.save()
        return ({"success": True, "data": None}, errors, warnings)
