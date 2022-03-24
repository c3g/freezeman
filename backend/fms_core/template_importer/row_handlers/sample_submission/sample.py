from datetime import datetime

from fms_core.models import Individual

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.project_link_samples import create_link
from fms_core.services.project import get_project
from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample
from fms_core.services.library import get_library_type, create_library
from fms_core.services.platform import get_platform
from fms_core.services.index import get_index

class SampleRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, sample, library, container, project, parent_container, individual, individual_mother, individual_father, sample_kind_objects_by_name):
        comment = f"Automatically generated via Sample submission Template on {datetime.utcnow().isoformat()}Z"

        # Container related section
        parent_container_obj = None
        if parent_container['barcode']:
            parent_container_obj, self.errors['parent_container'], self.warnings['parent_container'] = get_container(barcode=parent_container['barcode'])

        container_obj, _, self.errors['container'], self.warnings['container'] = \
            get_or_create_container(barcode=container['barcode'],
                                    kind=container['kind'],
                                    name=container['name'],
                                    coordinates=container['coordinates'],
                                    container_parent=parent_container_obj,
                                    creation_comment=comment,
                                    )

        # Project related section
        project_obj = None
        if project['name']:
            project_obj, self.errors['project'], self.warnings['project'] = get_project(project['name'])

        # Individual related section
        mother_obj = None
        if individual_mother['name']:
            mother_obj, self.errors['individual_mother'], self.warnings['individual_mother'] = \
                get_or_create_individual(name=individual_mother['name'],
                                         taxon=individual['taxon'],
                                         sex=Individual.SEX_FEMALE,
                                         pedigree=individual["pedigree"])

        father_obj = None
        if individual_father['name']:
            father_obj, self.errors['individual_father'], self.warnings['individual_father'] = \
                get_or_create_individual(name=individual_father['name'],
                                         taxon=individual['taxon'],
                                         sex=Individual.SEX_MALE,
                                         pedigree=individual["pedigree"])

        individual_obj = None
        need_individual = any([individual["taxon"],
                               individual["sex"],
                               individual["pedigree"],
                               individual["cohort"],
                               mother_obj,
                               father_obj])
        # When the individual name is not provided any field that is stored on the individual need to raise an error.
        self.errors['individual'] = []
        self.warnings['individual'] = []
        if not individual["name"] and need_individual:
            if individual["taxon"]:
                self.errors['individual'].append(f"Individual taxon requires an individual name to be provided to be saved.")
            if individual["sex"]:
                self.errors['individual'].append(f"Individual sex requires an individual name to be provided to be saved.")
            if individual["pedigree"]:
                self.errors['individual'].append(f"Individual pedigree requires an individual name to be provided to be saved.")
            if individual["cohort"]:
                self.errors['individual'].append(f"Individual cohort requires an individual name to be provided to be saved.")
            if mother_obj:
                self.errors['individual'].append(f"Individual mother requires an individual name to be provided to be saved.")
            if father_obj:
                self.errors['individual'].append(f"Individual father requires an individual name to be provided to be saved.")
        elif individual["name"]:
            individual_obj, self.errors['individual'], self.warnings['individual'] = \
                get_or_create_individual(name=individual['name'],
                                         taxon=individual['taxon'],
                                         sex=individual['sex'],
                                         pedigree=individual['pedigree'],
                                         cohort=individual['cohort'],
                                         mother=mother_obj,
                                         father=father_obj)
        else:
            self.warnings['individual'].append(f'Sample is not tied to any individual.')

        # Sample related section
        sample_kind_obj = None
        try:
            sample_kind_obj = sample_kind_objects_by_name[sample['sample_kind']]
        except KeyError as e:
            self.errors['sample_kind'] = [f"Sample Kind {sample['sample_kind']} not found"]
        #TODO: sample kind str normalization

        # Library are submitted
        if any([library['library_type'], library['index'], library['platform'], library['strandedness']]):
            # Create library objects
            library_type_obj, self.errors['library_type'], self.warnings['library_type']  = get_library_type(library['library_type'])
            index_obj, self.errors['index'], self.warnings['index']  = get_index(library['index'])
            platform_obj, self.errors['platform'], self.warnings['platform']  = get_platform(library['platform'])

            library_obj, self.errors['library'], self.warnings['library'] = create_library(library_type=library_type_obj,
                                                                                           index=index_obj,
                                                                                           platform=platform_obj,
                                                                                           strandedness=library['strandedness'])
        if not self.errors:
            sample_obj, self.errors['sample'], self.warnings['sample'] = \
                create_full_sample(name=sample['name'], volume=sample['volume'], collection_site=sample['collection_site'],
                                  creation_date=sample['creation_date'], coordinates=sample['coordinates'], alias=sample['alias'],
                                  concentration=sample['concentration'], tissue_source=sample['tissue_source'],
                                  experimental_group=sample['experimental_group'], container=container_obj, individual=individual_obj,
                                  library=library_obj, sample_kind=sample_kind_obj, comment=comment)

        

        # Link sample to project if requested
        if project_obj and sample_obj:
            _, self.errors['project_link'], self.warnings['project_link'] = create_link(sample=sample_obj, project=project_obj)


