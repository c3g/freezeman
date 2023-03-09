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
    "check_coordinate_overlap",
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

def is_alpha_digit_spec(spec: CoordinateSpec) -> bool:
    '''Determines if a CoordinateSpec is for the alpha/digit style, eg "A01, B12, etc..."'''
    if len(spec) == 2:
        alphas = spec[0]
        digits = spec[1]

        all_alphas = ''.join(alphas).isalpha()
        all_digits = ''.join(digits).isdigit()

        return all_alphas and all_digits

    return False

def convert_alpha_digit_coord_to_ordinal(coord: str, spec: CoordinateSpec) -> int:
    '''
    Convert a coordinate with the alpha/digit style (eg. A01) to an integer value, starting at 1.
    The coordinate spec must support this style of coordinate.
    The coordinate is expected to be valid.
    '''

    # Coordinate must be at least two chars long (eg "A1")
    if len(coord) < 2:
        raise CoordinateError(f'Cannot convert coord {coord} to ordinal - bad coord format.')
    
    # Spec must be for "A01" style coordinates.
    if not is_alpha_digit_spec(spec):
        raise CoordinateError(f'Cannot convert coord {coord} to ordinal - CoordinateSpec does not support coordinate style.')
    spec_letters = spec[0]
    spec_digits = spec[1]
    
    # Collect the characters at the start of the coord.
    letters = ''
    digits = ''
    for index in range(0, len(coord)):
        if str(coord[index]).isalpha():
            letters += coord[index]
        else:
            # Break on first digit and grab the remainder of the string
            digits = coord[index:]
            break

    if len(letters) == 0:
        raise CoordinateError(f'Cannot convert coord {coord} to ordinal - no letters were found.')

    if (len(digits) == 0):
        raise CoordinateError(f'Cannot convert coord {coord} to ordinal - no digits were found.')

    alpha_offset = 0
    try:
        # Find the index of the letter (or letters) in the spec
        letter_index = spec_letters.index(letters)
        # Compute the offset of that letter (number of "rows" of length N)
        alpha_offset = letter_index * len(spec_digits)
    except:
        raise CoordinateError(f'Cannot convert coord {coord} to ordinal - does not match coordinate spec.')

    # Convert the digits to an int value
    digit_offset = 0
    try:
        digit_offset = int(digits)
    except:
        raise CoordinateError(f'Cannot convert coord {coord} to ordinal - does not match coordinate spec.')

    return alpha_offset + digit_offset

def validate_and_normalize_coordinates(coords: str, spec: CoordinateSpec) -> str:
    """
    Given a set of coordinates and a coordinate spec, validates if those
    coordinates are valid by the spec.
    """

    # TODO: Handle padded 0s?

    if coords is None and spec == (): # empty tuple spec means no coordinates are required
        return coords

    coordinate_regex_str = "^" + "".join(f"({'|'.join(s)})" for s in spec) + "$"

    if coords is None:
        raise CoordinateError(f"Coordinates must be specified specified for coordinate system {coordinate_regex_str}")
    else:
        coordinate_regex = re.compile(coordinate_regex_str)
        c = unicodedata.normalize("NFC", coords.strip())

        if not coordinate_regex.match(c):
            raise CoordinateError(f"Invalid coordinates {c} specified for coordinate system {coordinate_regex_str}")

        return c


def check_coordinate_overlap(queryset, obj, parent, obj_type: str = "container"):
    """
    Check for coordinate overlap with existing child containers/samples of the
    parent using a queryset, assuming that the queried model has a coordinate
    field which specifies possibly-overlapping item locations.
    """
    existing = queryset.exclude(pk=obj.pk).get(coordinate=obj.coordinate)
    raise CoordinateError(f"Parent container {parent} already contains {obj_type} {existing}"
                          f"{f' at coordinates {obj.coordinate.name}' if obj.coordinate is not None else ''}")
