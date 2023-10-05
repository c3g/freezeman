from ._generic import GenericAutomation
from os import path
from fms.settings import FMS_AXIOM_ARRAYS_PATH
from typing import List
from fms_core.models import Container

class AxiomCreateFolders(GenericAutomation):
    
    def execute(self, sample_ids: List):
        """
        AxiomCreateFolders
    

        Args:
        

        Returns:
        
        """
        # build list of folder from sample plate info
        for container in Container.objects.filter(samples__id__in=sample_ids).all().distinct():
            with open(path.join(FMS_AXIOM_ARRAYS_PATH, container.name), "w") as fp:
                pass