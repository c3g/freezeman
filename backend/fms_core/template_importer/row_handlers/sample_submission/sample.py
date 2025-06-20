from datetime import datetime, timezone
from django.core.exceptions import ValidationError

from fms_core.models import Individual, Sample

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.project_link_samples import create_link
from fms_core.services.sample_next_step import queue_sample_to_study_workflow
from fms_core.services.project import get_project
from fms_core.services.study import get_study
from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.individual import get_or_create_individual, get_taxon, get_reference_genome
from fms_core.services.sample import create_full_sample
from fms_core.services.library import get_library_type, get_library_selection, create_library
from fms_core.services.platform import get_platform
from fms_core.services.index import get_index
from fms_core.services.id_generator import get_unique_id
from fms_core.models._validators import name_validator_without_dot

class SampleRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def validate_row_input(self, **kwargs):
        super().validate_row_input(**kwargs)

        sample = kwargs["sample"]
        # make sure all required values are present. WIP.
        if sample["sample_kind"] is None:
            self.errors['sample_kind'] = [f"Sample Kind is a required field."]
        if sample["volume"] is None:
            self.errors['volume'] = [f"Volume (uL) is a required field."]

    def process_row_inner(self, sample, library, container, project, parent_container, individual, sample_kind_objects_by_name, defined_pools):
        comment = sample['comment'] if sample['comment'] else f"Automatically generated via Sample submission Template on {datetime.now(timezone.utc).isoformat()}Z"

        # Individual related section
        taxon_obj = None
        if individual['taxon']:
            taxon_obj, self.errors['taxon'], self.warnings['taxon'] = get_taxon(name=individual['taxon'])

        reference_genome_obj = None
        if individual['reference_genome']:
            reference_genome_obj, self.errors['reference_genome'], self.warnings['reference_genome'] = get_reference_genome(assembly_name=individual['reference_genome'])

        individual_obj = None
        need_individual = any([individual["taxon"],
                               individual["sex"],
                               individual["cohort"],
                               individual["alias"],
                               individual["reference_genome"]])
        # can_use_generic_individual tests conditions that need to be met for a generic individual to be created successfully if no individual name is provided.
        # Taxon is the basic of the individual. It is required. reference_genome_obj could replace it since it is tied to a taxon.
        can_use_generic_individual = any([taxon_obj is not None, reference_genome_obj is not None])
        self.errors['individual'] = []
        self.warnings['individual'] = []
        # When the individual name is not provided any field that is stored on the individual need to raise an error if no generic individual can be created.
        if not individual["name"] and need_individual and not can_use_generic_individual:
            if individual["sex"]:
                self.errors['individual'].append(f"Individual sex requires an individual name or taxon to be provided to be saved.")
            if individual["cohort"]:
                self.errors['individual'].append(f"Individual cohort requires an individual name or taxon to be provided to be saved.")
            if individual["alias"]:
                self.errors['individual'].append(f"Individual alias requires an individual name or taxon to be provided to be saved.")
        elif individual["name"] or (need_individual and can_use_generic_individual):
            # We need taxon, reference_genome and sex
            if taxon_obj is None and reference_genome_obj is not None:
                taxon_obj = reference_genome_obj.taxon
            if reference_genome_obj is None and taxon_obj is not None:
                reference_genome_obj = taxon_obj.default_reference_genome
            if individual["sex"] is None:
                individual["sex"] = Individual.SEX_UNKNOWN
            if not individual["name"]:
                individual["name"] = Individual.GENERIC_INDIVIDUAL_PREFIX + str(get_unique_id())
                is_generic = True
            else:
                is_generic = None # Not False because someone might want to reference a preexisting generic individual

            individual_obj, created, self.errors['individual'], self.warnings['individual'] = \
                get_or_create_individual(name=individual['name'],
                                         alias=individual['alias'],
                                         taxon=taxon_obj,
                                         sex=individual['sex'],
                                         cohort=individual['cohort'],
                                         reference_genome=reference_genome_obj,
                                         is_generic=is_generic)

            if not created and not self.errors['individual']:
                self.warnings['individual'].append(('Individual already exists and was not created. Reference Genome may need to be updated separately.', []))
        else:
            self.warnings['individual'].append(('Sample is not tied to any individual.', []))

        # Sample related section
        sample_kind_obj = None
        try:
            sample_kind_obj = sample_kind_objects_by_name[sample['sample_kind']]
        except KeyError as e:
            self.errors['sample_kind'] = [f"Sample Kind {sample['sample_kind']} not found."]
        #TODO: sample kind str normalization
        tissue_source_obj = None
        if sample['tissue_source']:
            try:
                tissue_source_obj = sample_kind_objects_by_name[sample['tissue_source']]
            except KeyError as e:
                self.errors['tissue_source'] = [f"Tissue source {sample['tissue_source']} not found."]

        # Library are submitted
        library_obj = None
        is_library = any([library['library_type'], library['index'], library['platform'], library['strandedness']])
        if is_library:
            # Create library objects
            library_type_obj, self.errors['library_type'], self.warnings['library_type'] = get_library_type(library['library_type'])
            index_obj, self.errors['index'], self.warnings['index'] = get_index(library['index'])
            platform_obj, self.errors['platform'], self.warnings['platform'] = get_platform(library['platform'])
            library_selection_obj = None
            if library['selection_name'] and library['selection_target']:
                library_selection_obj, self.errors['library_selection'], self.warnings['library_selection'] = \
                    get_library_selection(name=library['selection_name'], target=library['selection_target'])
            elif bool(library['selection_name']) != bool(library['selection_target']):
                self.errors['library_selection'].append(f"Selection and Selection Target need to have both values together to define the library.")

            library_obj, self.errors['library'], self.warnings['library'] = create_library(library_type=library_type_obj,
                                                                                           index=index_obj,
                                                                                           platform=platform_obj,
                                                                                           strandedness=library['strandedness'],
                                                                                           library_selection=library_selection_obj)

        # Project related section
        project_obj = None
        studies_obj = []
        if project['name']:
            project_obj, self.errors['project'], self.warnings['project'] = get_project(project['name'])

            if project_obj and project['study_letter']:
                  study_letters = [s.strip() for s in project['study_letter'].split("-") if s != ""]
                  for study_letter in study_letters:
                      study, study_errors, study_warnings = get_study(project_obj, study_letter)
                      self.errors['study'].extend(study_errors)
                      self.warnings['study'].extend(study_warnings)
                      if study is not None:
                          studies_obj.append(study)
        else:
            self.errors['project'] = [f"New samples must be assigned to a project."]

        # Continue creating the sample objects if this sample is not associated with a pool
        if library['pool_name'] is None:
            # Output warning if the there is already a sample with the same name
            if Sample.objects.filter(name__exact=sample['name']).exists():
                self.warnings['name'] = ('Sample with the same name [{0}] already exists. A new sample with the same name will be created.', [sample["name"]])

            # Container related section
            parent_container_obj = None
            if parent_container['barcode']:
                parent_container_obj, _, self.errors['parent_container'], self.warnings['parent_container'] = \
                    get_or_create_container(barcode=parent_container['barcode'],
                                            kind=parent_container['kind'],
                                            name=parent_container['name'],
                                            creation_comment=comment)

            container_obj, _, self.errors['container'], self.warnings['container'] = \
                get_or_create_container(barcode=container['barcode'],
                                        kind=container['kind'],
                                        name=container['name'],
                                        coordinates=container['coordinates'],
                                        container_parent=parent_container_obj,
                                        creation_comment=comment)

            sample_obj = None
            if library_obj is not None or not is_library:
                sample_obj, self.errors['sample'], self.warnings['sample'] = \
                    create_full_sample(name=sample['name'], volume=sample['volume'], collection_site=sample['collection_site'],
                                       creation_date=sample['creation_date'], coordinates=sample['coordinates'], alias=sample['alias'],
                                       concentration=sample['concentration'], tissue_source=tissue_source_obj,
                                       experimental_group=sample['experimental_group'], container=container_obj, individual=individual_obj,
                                       library=library_obj, sample_kind=sample_kind_obj, comment=comment)

            # Link sample to project if requested
            if project_obj and sample_obj:
                _, self.errors['project_link'], self.warnings['project_link'] = create_link(sample=sample_obj, project=project_obj)
                for study_obj in studies_obj:
                    _, queue_errors, queue_warnings  = queue_sample_to_study_workflow(sample_obj, study_obj)
                    self.errors['queue_to_study'].extend(queue_errors)
                    self.warnings['queue_to_study'].extend(queue_warnings)

        # If this sample belongs to a pool but the library obj was not created
        elif library['pool_name'] and not library_obj:
            self.errors['pooling'] = [f"A valid library is necessary to pool this sample."]
        # for pools
        else:
            sample['alias'] = sample['alias'] or sample['name']
            if not sample['alias']:
                self.errors['alias'].append([f"A pooled library must have a valid alias."])
            else:
                # Since sample fields are not validated for pooling (through sample creation),
                # we need to validate manually here
                try:
                    name_validator_without_dot(sample['alias'])
                except ValidationError as e:
                    self.errors['alias'] = [f"Sample Name or Alias {sample['alias']} is not valid."]
            if defined_pools.get(library['pool_name'], None) is None:
                self.errors['pooling'] = [f"Pool {library['pool_name']} for the library in pool {sample['name']} is not defined on the PoolSubmission sheet."]

        # For pooling purposes
        self.row_object = {
            # Biosample info
            "alias": sample['alias'],
            "individual": individual_obj,
            "collection_site": sample['collection_site'],
            # Derived sample info
            "sample_kind": sample_kind_obj,
            "tissue_source": tissue_source_obj,
            "experimental_group": sample['experimental_group'],
            "library": library_obj,
            "project": project_obj,
            "studies": studies_obj,
            # Pool relation info
            "volume": sample['volume'],
        }