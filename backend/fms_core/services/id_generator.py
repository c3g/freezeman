from django.db import Error
from fms_core.models import IdGenerator

def get_unique_id():
    """
    returns a unique 64bit int
    """
    return IdGenerator.objects.create().id