from fms_core.models import Instrument, InstrumentType

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

def get_instrument_type(type):
    instrument_type = None
    errors = []
    warnings = []
    try:
        instrument_type = InstrumentType.objects.get(type=type)
    except InstrumentType.DoesNotExist as e:
        errors.append(f"No instrument type by the name of {type} could be found.")
    except InstrumentType.MultipleObjectsReturned as e:
        errors.append(f"More than one instrument type was found with the name {type}.")

    return (instrument_type, errors, warnings)