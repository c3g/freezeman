from datetime import datetime

from fms_core.models import Individual

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_sample

class SampleRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, sample, container, parent_container, individual, individual_mother, individual_father,
                          sample_kind_objects_by_name):
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
                                    container_parent=parent_container_obj,
                                    creation_comment=comment,
                                    )

        print('Container', container_obj)


        # Individual related section

        mother_obj = None
        if individual_mother['name']:
            mother_obj, self.errors['individual_mother'], self.warnings['individual_mother'] = \
                get_or_create_individual(name=individual_mother['name'],
                                         taxon=individual['taxon'],
                                         sex=Individual.SEX_FEMALE,
                                         )
        print('Mother', mother_obj)

        father_obj = None
        if individual_father['name']:
            father_obj, self.errors['individual_father'], self.warnings['individual_father'] = \
                get_or_create_individual(name=individual_father['name'],
                                         taxon=individual['taxon'],
                                         sex=Individual.SEX_MALE,
                                         )
        print('Father', father_obj)

        individual_obj, self.errors['individual'], self.warnings['individual'] = \
            get_or_create_individual(name=individual['name'],
                                     taxon=individual['taxon'],
                                     sex=individual['sex'],
                                     pedigree=individual['pedigree'],
                                     cohort=individual['cohort'],
                                     mother=mother_obj,
                                     father=father_obj,
                                     )
        print('Individual', individual_obj)

        # Sample related section

        sample_kind_obj = None
        try:
            sample_kind_obj = sample_kind_objects_by_name[sample['sample_kind']]
        except KeyError as e:
            self.errors['sample_kind'] = [f"Sample Kind {sample['sample_kind']} not found"]
        #TODO: sample kind str normalization


        sample_obj, self.errors['sample'], self.warnings['sample'] = \
            create_sample(
                name=sample['name'], volume=sample['volume'], collection_site=sample['collection_site'],
                creation_date=sample['creation_date'], coordinates=sample['coordinates'], alias=sample['alias'],
                concentration=sample['concentration'], tissue_source=sample['tissue_source'], phenotype=sample['phenotype'],
                experimental_group=sample['experimental_group'],
                container=container_obj, individual=individual_obj, sample_kind=sample_kind_obj,
                comment=comment
            )
        print('SAMPLE OBJ', sample_obj)

        print('sample_submission/sample row handler ERRORS: ', self.errors)