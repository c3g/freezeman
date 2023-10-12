from ._generic import GenericAutomation
from os import path
from fms.settings import FMS_AUTOMATIONS_WORK_PATH
from typing import List
from fms_core.models import Container

WORK_FOLDER = "axiom_arrays"
FILE_SUFFIX = ".PROJECT"
REMOVED_CONTAINER_SUFFIX = "_AFHD"

class AxiomCreateFolders(GenericAutomation):
    def __init__(self):
        super().__init__()
        self.work_folder = path.join(FMS_AUTOMATIONS_WORK_PATH, WORK_FOLDER)

    def execute(self, sample_ids: List):
        """
        Execute the AxiomCreateFolders automation to create folders and files for the genotyping scanner outputs.
        The name used for the folder and file created inside are based on the container name and id of the samples listed.

        Args:
        `sample_ids`: A list of samples that are ready for the Axiom experiment run. 

        Returns:
        A tuple containing errors and warnings encountered during execution.
        
        """
        
        # build list of folder from sample plate info
        for container in Container.objects.filter(samples__id__in=sample_ids).all().distinct():
            project = container.name.replace(REMOVED_CONTAINER_SUFFIX, "") + str(container.id)
            with open(path.join(self.work_folder, project, project + FILE_SUFFIX), "w") as fp:
                fp.write(project)

        return (self.errors, self.warnings)