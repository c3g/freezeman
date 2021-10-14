from fms_core.models import Project
from django.core.exceptions import ValidationError
import datetime

def get_project(name=None):
    project = None
    errors = []
    warnings = []

    if name:
        try:
            project = Project.objects.get(name=name)
        except Project.DoesNotExist:
            errors.append(f"Could not find Project with name {name}")
    else:
        errors.append(f"Name is required to get a project.")

    return (project, errors, warnings)

def create_project(name=None, principal_investigator=None, requestor_name=None,
                   requestor_email=None, status=None, target_end_date=None, comment=None):
    project = None
    errors = []
    warnings = []

    project_data = dict(
        name=name,
        principal_investigator=principal_investigator,
        requestor_name=requestor_name,
        requestor_email=requestor_email,
        status=status,
        target_end_date=target_end_date,
        comment=(comment or (f"Automatically generated on {datetime.utcnow().isoformat()}Z")),
        # Optional attributes
        **(dict(principal_investigator=principal_investigator) if principal_investigator is not None else dict()),
        **(dict(requestor_name=requestor_name) if requestor_name is not None else dict()),
        **(dict(requestor_email=requestor_email) if requestor_email is not None else dict()),
        **(dict(status=status) if status is not None else dict()),
        **(dict(target_end_date=target_end_date) if target_end_date is not None else dict()),
    )

    try:
        project = Project.objects.create(**project_data)
    except ValidationError as e:
        errors.append(str(e))

    return (project, errors, warnings)