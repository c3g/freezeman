from fms_core.models import Platform

def get_platform(name):
    platform = None
    errors = []
    warnings = []
    try:
        platform = Platform.objects.get(name=name)
    except Platform.DoesNotExist as e:
        errors.append(f"No platform named {name} could be found.")
    except Platform.MultipleObjectsReturned as e:
        errors.append(f"More than one platform was found with the name {name}.")

    return (platform, errors, warnings)