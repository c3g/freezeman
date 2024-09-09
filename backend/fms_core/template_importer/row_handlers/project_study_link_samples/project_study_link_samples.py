from datetime import datetime

from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container
from fms_core.services.project import add_sample_to_study, get_project
from fms_core.services.project_link_samples import create_link, remove_link
from fms_core.services.study import get_study
from fms_core.services.sample_next_step import queue_sample_to_study_workflow, is_sample_queued_in_study, dequeue_sample_from_specific_step_study_workflow, dequeue_sample_from_all_steps_study_workflow

ADD_PROJECT_STUDY_ACTION = "ADD TO PROJECT AND STUDY"
ADD_STUDY_ACTION = "ADD TO STUDY"
REMOVE_PROJECT_ACTION = "REMOVE FROM PROJECT"
REMOVE_STUDY_ACTION = "REMOVE FROM STUDY"

class ProjectStudyLinkSamplesHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()


    def process_row_inner(self, sample, project, action):
        # Get sample object
        sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(barcode=sample['sample_container_barcode'],
                                                                                               coordinates=sample['sample_container_coord'])
        # Get project object
        project_obj, self.errors['project'], self.warnings['project'] = get_project(project['name'])

        if sample_obj and project_obj:
            if sample_obj.name != sample['sample_name']:
                warning_msg = f"Sample in container with barcode {sample['sample_container_barcode']} " + \
                              (f"at coordinate {sample['sample_container_coord']} " if sample['sample_container_coord'] else f"") + \
                              f"is named {sample_obj.name} not {sample['sample_name']}."

            # Perform an add project and/or study action
            if action['name'] == ADD_PROJECT_STUDY_ACTION:
                # Create link object if no errors
                link_created, self.errors['link'], self.warnings['link'] = create_link(sample=sample_obj,
                                                                                       project=project_obj)

                # Queue sample to study if provided
                if project['study_letter']:
                    study_obj, self.errors['study'], self.warnings['study'] = get_study(project_obj, project['study_letter'])

                    if study_obj:
                        # To avoid empty step orders
                        step_order = project['step_order'] if project['step_order'] else study_obj.start

                        # Check if sample is already queued 
                        is_sample_queued, self.errors['sample_queued'], self.warnings['sample_queued'] = is_sample_queued_in_study(sample_obj, study_obj, step_order)
                        if not is_sample_queued:
                            _, self.errors['add_to_study'], self.warnings['add_to_study'] = queue_sample_to_study_workflow(sample_obj, study_obj, step_order)
                        else:
                            self.errors['study'] = f"Sample [{sample_obj.name}] is already queued in study [{project['study_letter']}] \
                                of project [{project['name']}] at step [{project['step_order']}]."
                    else:
                        self.errors['study'] = f"Specified study [{project['study_letter']}] doesn't exist for project [{project['name']}]."

            # Perform an add study action
            elif action['name'] == ADD_STUDY_ACTION:
                errors, warnings = add_sample_to_study(sample_obj, project_obj, project['study_letter'], project['step_order'])
                self.errors.update(errors)
                self.warnings.update(warnings)
            # Perform a remove project action
            elif action['name'] == REMOVE_PROJECT_ACTION:
                # If a study letter is provided
                if project['study_letter']:
                    self.errors['remove_project'] = f"A study [{project['study_letter']}] was specified. \
                        If you intend to remove sample [{sample_obj.name}] from a single study use the [Remove from study] action."
                # If the study is not specified, dequeue the sample from all the studies of the selected project
                else:
                    num_dequeued = 0
                    for study in project_obj.studies.all():
                         # Check if sample is queued 
                        is_sample_queued, self.errors['sample_queued'], self.warnings['sample_queued'] = is_sample_queued_in_study(sample_obj, study)
                        
                        if is_sample_queued:
                            # Don't specify order to be able remove all instances of sample in the study, regardless of step
                            num_dequeued, self.errors['remove_from_study'], self.warnings['queue_to_study'] = dequeue_sample_from_all_steps_study_workflow(sample_obj, study)
                            num_dequeued += num_dequeued
                    if num_dequeued > 0:
                        self.warnings['remove_project'] = ("Removing sample [{0}] from project [{1}] will also remove the sample from [{2}] studies.", [sample_obj.name, project_obj.name, project_obj.studies.all().count()])
                
                if not any(self.errors.values()):
                    # Remove link object if no errors
                    link_removed, self.errors['link'], self.warnings['link'] = remove_link(sample=sample_obj,
                                                                                        project=project_obj)

            # Perform a remove study action
            elif action['name'] == REMOVE_STUDY_ACTION:
                # Dequeue sample from a specified study 
                if project['study_letter']:
                    study_obj, self.errors['study'], self.warnings['study'] = get_study(project_obj, project['study_letter'])

                    if study_obj:
                        # To avoid empty step orders
                        step_order = project['step_order']
                        if step_order is not None:
                            # Check if sample is queued 
                            is_sample_queued, self.errors['sample_queued'], self.warnings['sample_queued'] = is_sample_queued_in_study(sample_obj, study_obj, step_order)
                            if is_sample_queued:
                                dequeued, self.errors['remove_from_study'], self.warnings['remove_from_study'] = dequeue_sample_from_specific_step_study_workflow(sample_obj, study_obj, step_order)
                            else:
                                self.errors['study'] = f"Sample [{sample_obj.name}] is not queued in study [{project['study_letter']}] of project [{project_obj.name}] at step [{step_order}]."
                        else:
                            self.errors['workflow_step_order'] = f"A workflow study order is needed to remove a sample from a study."
                    else:
                        self.errors['study'] = f"Specified study [{project['study_letter']}] doesn't exist for project [{project['name']}]."
                # If the study is not specified, throw an error
                else:
                    self.errors['remove_from_study'] = f"A study has to be specified to be able to remove sample [{sample_obj.name}] from a study."


            # Action not provided or invalid
            else:
                self.errors['action'] = 'An action is required.'
