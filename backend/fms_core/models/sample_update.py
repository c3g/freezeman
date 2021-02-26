from .sample import Sample

__all__ = ["SampleUpdate"]


class SampleUpdate(Sample):
    class Meta:
        proxy = True
