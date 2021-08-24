from datatime import datetime

from fms_core.models import Individual

from fms_core.import_tool.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.individual import get_or_create_individual

class SampleRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, sample, container, parent_container, individual, individual_mother, individual_father,
                          sample_kind_objects_by_kind):
        print('start sample row handler')

        comment = f"Automatically generated via Sample submission Template on {datetime.utcnow().isoformat()}Z"

        # Container related section

        parent_container_obj = None
        if parent_container['barcode']:
            parent_container_obj, self.errors['parent_container'], self.warnings['parent_container'] = get_container(barcode=parent_container['barcode'])

        container_obj, self.errors['container'], self.warnings['container'] = \
            get_or_create_container(barcode=container['barcode'],
                                    kind=container['kind'],
                                    name=container['name'],
                                    coordinates=container['coordinates'],
                                    container_parent=parent_container_obj,
                                    creation_comment=comment,
                                    )


        # Individual related section

        mother = None
        if individual_mother['name']:
            mother, self.errors['individual_mother'], self.warnings['individual_mother'] = \
                get_or_create_individual(name=individual_mother['name'],
                                         taxon=individual['taxon'],
                                         sex=Individual.SEX_FEMALE,
                                         )
        father = None
        if individual_father['name']:
            father, self.errors['individual_father'], self.warnings['individual_father'] = \
                get_or_create_individual(name=individual_father['name'],
                                         taxon=individual['taxon'],
                                         sex=Individual.SEX_MALE,
                                         )

        individual = None
        individual, self.errors['individual'], self.warnings['individual'] = \
            get_or_create_individual(name=individual['name'],
                                     taxon=individual['taxon'],
                                     sex=individual['sex'],
                                     pedigree=individual['pedigree'],
                                     cohort=individual['cohort'],
                                     mother=mother,
                                     father=father,
                                     )

        sample_kind_object = sample_kind_objects_by_kind[sample['sample_kind']]
        #TODO: sample kind str normalization and check if it fits one of the sample kinds, otherwise add error

        sample = None




