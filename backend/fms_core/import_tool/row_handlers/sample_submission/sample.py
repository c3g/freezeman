from datetime import datetime

from fms_core.models import Individual

from fms_core.import_tool.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_sample

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

        mother_obj = None
        if individual_mother['name']:
            mother_boj, self.errors['individual_mother'], self.warnings['individual_mother'] = \
                get_or_create_individual(name=individual_mother['name'],
                                         taxon=individual['taxon'],
                                         sex=Individual.SEX_FEMALE,
                                         )
        father_obj = None
        if individual_father['name']:
            father_obj, self.errors['individual_father'], self.warnings['individual_father'] = \
                get_or_create_individual(name=individual_father['name'],
                                         taxon=individual['taxon'],
                                         sex=Individual.SEX_MALE,
                                         )

        individual_obj, self.errors['individual'], self.warnings['individual'] = \
            get_or_create_individual(name=individual['name'],
                                     taxon=individual['taxon'],
                                     sex=individual['sex'],
                                     pedigree=individual['pedigree'],
                                     cohort=individual['cohort'],
                                     mother=mother_obj,
                                     father=father_obj,
                                     )

        # Sample related section

        sample_kind_obj = sample_kind_objects_by_kind[sample['sample_kind']]
        #TODO: sample kind str normalization and check if it fits one of the sample kinds, otherwise add error

        sample_obj, self.errors['sample'], self.warnings['sample'] = \
            create_sample(
                name=sample['name'], volume=sample['volume'], collection_site=sample['collection_site'],
                creation_date=sample['creation_date'], coordinates=sample['coordinates'], alias=sample['alias'],
                concentration=sample['concentration'], tissue_source=sample['tissue_source'], phenotype=sample['phenotype'],
                experimental_group=sample['experiment_group'],
                container=container_obj, individual=individual_obj, sample_kind=sample_kind_obj,
                comment=comment
            )




