from ._generic import GenericResource
from ..models import Process


__all__ = ["ProcessResource"]


class ProcessResource(GenericResource):
    class Meta:
        model = Process

