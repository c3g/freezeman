from ._generic import GenericResource
from ..models import Protocol


__all__ = ["ProtocolResource"]


class ProtocolResource(GenericResource):
    class Meta:
        model = Protocol
