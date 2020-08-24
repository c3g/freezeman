from .container import Container


__all__ = ["ContainerMove"]


class ContainerMove(Container):
    class Meta:
        proxy = True
