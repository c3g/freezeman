from fms_core.models import LibraryType

def get_library_type(name):
    instrument = None
    errors = []
    warnings = []
    try:
        library_type = LibraryType.objects.get(name=name)
    except LibraryType.DoesNotExist as e:
        errors.append(f"No Experiment Type named {name} could be found.")
    except LibraryType.MultipleObjectsReturned as e:
        errors.append(f"More than one Experiment Type was found with the name {name}.")

    return (instrument, errors, warnings)

def create_library(library_type, library_date, samples_info, process_properties, comment):
    pass