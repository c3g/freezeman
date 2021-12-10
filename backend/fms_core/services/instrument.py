from fms_core.models import Instrument

def get_instrument(name):
    instrument = None
    errors = []
    warnings = []
    try:
        instrument = Instrument.objects.get(name=name)
    except Instrument.DoesNotExist as e:
        errors.append(f"No instrument named {name} could be found.")
    except Instrument.MultipleObjectsReturned as e:
        errors.append(f"More than one instrument was found with the name {name}.")

    return (instrument, errors, warnings)