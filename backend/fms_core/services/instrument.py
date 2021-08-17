from fms_core.models import Instrument

def get_instrument(name):
    instrument = None
    errors = []
    try:
        instrument = Instrument.objects.get(name=name)
    except Instrument.DoesNotExist as e:
        errors.append(f"No instrument named {name} could be found.")

    return (instrument, errors)