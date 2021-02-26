from .container import Container


__all__ = ["ContainerRename"]


class ContainerRename(Container):
    class Meta:
        proxy = True
