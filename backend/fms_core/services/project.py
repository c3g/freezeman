from fms_core.models import Project

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