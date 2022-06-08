"""
Class specifying types and functions for the FreezeMan coordinate system.
Coordinates are used to locate samples / containers within certain types of
container, and can be customized to use different types of coordinate ranges.
"""


import re
import unicodedata
from typing import Tuple, Union


__all__ = [
    "CoordinateAxis",
    "CoordinateSpec",

    "CoordinateError",

    "alphas",
    "ints",

    "validate_and_normalize_coordinates",
    "detect_coordinate_overlap",
]


CoordinateAxis = Tuple[str, ...]
CoordinateSpec = Union[Tuple[()], Tuple[CoordinateAxis], Tuple[CoordinateAxis, CoordinateAxis]]


class CoordinateError(Exception):
    pass


def alphas(end: int) -> CoordinateAxis:
    """
    Generates a tuple of alphabet-derived values for a coordiante axis.
    """

    if end < 0:
        raise ValueError

    if end > 26:
        raise ValueError

    return tuple(chr(a) for a in range(65, 65 + end))


def ints(end: int, pad_to: int = 0) -> CoordinateAxis:
    """
    Generates a tuple of integer-derived values for a coordinate axis.
    If pad_to is specified, the integer strings will be left-0-padded to the
    specified length.
    """

    if end < 0:
        raise ValueError

    return tuple(str(i).zfill(pad_to) for i in range(1, end + 1))


def validate_and_normalize_coordinates(coords: str, spec: CoordinateSpec) -> str:
    """
    Given a set of coordinates and a coordinate spec, validates if those
    coordinates are valid by the spec.
    """

    # TODO: Handle padded 0s?

    c = unicodedata.normalize("NFC", coords.strip())

    coordinate_regex_str = "^" + "".join(f"({'|'.join(s)})" for s in spec) + "$"
    coordinate_regex = re.compile(coordinate_regex_str)

    if not coordinate_regex.match(c):
        raise CoordinateError(f"Invalid coordinates {c} specified for coordinate system {coordinate_regex_str}")

    return c

def detect_coordinate_overlap(queryset, obj, parent, obj_type: str = "container"):
    """
    Check for coordinate overlap with existing child containers/samples of the
    parent using a queryset, assuming that the queried model has a coordinates
    field which specifies possibly-overlapping item locations.
    """
    error = None
    exists = queryset.exclude(pk=obj.pk).filter(coordinates=obj.coordinates).exists()
    if exists:
        error = f"Parent container {parent} already contains {obj_type} at coordinates {obj.coordinates}"
    return (exists, error)
