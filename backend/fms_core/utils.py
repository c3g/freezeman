import math
import re
import unicodedata
import os
import time
from django.conf import settings
import datetime
from decimal import Decimal
from typing import Any, Generator, Iterable, NewType, TypeVar, TypedDict, Union


__all__ = [
    "RE_SEPARATOR",
    "RE_WHITESPACE",

    "blank_str_to_none",

    "check_truth_like",
    "normalize_scientific_name",
    "float_to_decimal",
    "str_normalize",
    "str_cast_and_normalize",
    "get_normalized_str",
    "comma_separated_string_to_array",
    "unique"
]


RE_SEPARATOR = re.compile(r"[,;]\s*")
RE_WHITESPACE = re.compile(r"\s+")


TRUTH_VALUES = frozenset({"TRUE", "T", "YES", "Y"})

def unique(sequence):
    seen = set()
    return [x for x in sequence if not (x in seen or seen.add(x))]

def comma_separated_string_to_array(s):
    """
    Returns empty list if argument is a blank string or None,
    otherwise it returns a list of strings
    """
    return [v.strip() for v in s.split(',')] if s else []

def blank_str_to_none(s: Any):
    """
    Returns None if the argument is a blank string, or the argument with no
    changes otherwise.
    """
    return None if s == "" else s


def check_truth_like(string: str) -> bool:
    """
    Checks if a string contains a "truth-like" value, e.g. true, yes, etc.
    """
    return str_normalize(string).upper() in TRUTH_VALUES


def float_to_decimal(n: Union[float, str], decimals: int = 3) -> Decimal:
    tpl = f"{{:.{decimals}f}}"
    return Decimal(tpl.format(float(n)))

def decimal_rounded_to_precision(val: Decimal, decimals: int = 3) -> Decimal:
    precision = Decimal(10) ** -decimals
    return val.quantize(precision)


def normalize_scientific_name(name: str) -> str:
    """
    A normalization function for Latin / "scientific" species names.
    Converts e.g. (HOMO SAPIENS or Homo Sapiens or ...) to Homo sapiens
    """
    return " ".join((a.title() if i == 0 else a.lower()) for i, a in enumerate(RE_WHITESPACE.split(name or "")))


def str_normalize(s: str) -> str:
    """
    Normalizes the Unicode characters of and strips a string.
    """
    return unicodedata.normalize("NFC", s.strip()) if isinstance(s, str) else s


def str_cast_and_normalize(s) -> str:
    """
    Casts a value to a string and then normalizes it using str_normalize.
    """
    return str_normalize(str(s) if s is not None else s)


def str_cast_and_normalize_lower(s) -> Union[str, None]:
    """
    Casts a value to a string, normalizes it and then converts to lower case.
    """
    result = str_cast_and_normalize(s)
    return result.lower() if result is not None else result

def get_normalized_str(d: dict, key: str, default: str = "") -> str:
    """
    Gets a string-valued item from a dictionary using a provided key. If the
    value is false-y, returns a default string value instead.
    """
    return str_cast_and_normalize(d.get(key) or default)

def remove_empty_str_from_dict(d) -> dict:
    """
    Gets a dictionary, and replaces all empty string values with a None object.
    """
    d = {k: None if not v else v for k, v in d.items() }
    return d


def is_date_or_time_after_today(date: datetime.datetime) -> Union[bool, None]: 
    if not isinstance(date, datetime.date):
        return None
    date_as_string = f"{date.year}-{date.month:02}-{date.day:02}"
    return date_as_string > str(datetime.datetime.now().date())
    

def convert_concentration_from_ngbyul_to_nm(concentration: float, molecular_weight: float, molecule_count: float) -> float:
    """
    Gets a concentration in ng/uL and convert it to molar concentration in nM.
    If any of the parameters are None or if the molecular_weight or the molecule_count is 0,
    the function return None implying an erroneous state.
    """
    molar_concentration = None
    if concentration is None or not molecular_weight or not molecule_count:  # Prevent division by 0 and operation on NoneType
        return molar_concentration
    molar_concentration = (concentration / (molecule_count * molecular_weight)) * 1000000

    return molar_concentration


#TODO Test this
def convert_concentration_from_nm_to_ngbyul(concentration_nm, molecular_weight, molecule_count) -> Decimal:
    """
    Gets a concentration in nM and convert it to molar concentration in ng/uL.
    If any of the parameters are None or if the molecular_weight or the molecule_count is 0,
    the function returns None implying an erroneous state.
    """
    if concentration_nm is None or not molecular_weight or not molecule_count:
        return None
    concentration = (Decimal(concentration_nm) * Decimal(molecule_count) * Decimal(molecular_weight)) / Decimal(1000000)

    return concentration

T = TypeVar('T')
def make_generator(obj: Union[T, None, Iterable[T]]) -> Generator[T, None, None]:
    """
    Ensures that ManyToMany fields such as the `obj` passed are iterable.
    None is turned into an empty iterable,
    non-None objects are turned into an iterable with a single element,
    and iterable objects remain the same.
    It's meant to handle the fact that a ManyToMany field is not a list if it has less than two elements.

    Args:
        obj: T

    Returns:
        `Generator[T, None, None]`

    Yields:
        `T`
    """

    if obj is None:
        return
    else:
        try:
            for x in obj:
                yield x
        except TypeError:
            yield obj

def make_timestamped_filename(file_name: str) -> tuple[str, str]:
    """
    Creates a file name composed of a base file name followed by a timestamp, followed
    by the file extension, eg "MyFile_2022-11-25_08-13-45.json".

    The file name and timestamp are separated by an underscore.

    Args:
        `file_name`: A file name (or file path).

    Returns:
        a tuple with file name (or file path), with a timestamp inserted before the extension, and the timestamp used in isoformat.
    """
    name, extension = os.path.splitext(file_name)
    os.environ["TZ"] = settings.LOCAL_TZ
    time.tzset()
    timestamp = datetime.datetime.now()
    str_timestamp = timestamp.strftime('%Y-%m-%d_%H-%M-%S')
    return f"{name}_{str_timestamp}{extension}", timestamp.isoformat()


Warnings = NewType('Warnings', dict[str, tuple[str] | str | list[str] | list[tuple[str, list]]])
class SerializedWarningItem(TypedDict):
    key: str
    format: str
    args: list[str]
SerializedWarnings = list[SerializedWarningItem]
def serialize_warnings(warnings: Warnings) -> SerializedWarnings:
    serialized = []
    for (k, vs) in (warnings).items():
        if isinstance(vs, tuple):
            # turn a single tuple warning into a canonical
            # warning assuming each element is a string

            if len(vs) < 2:
                # ensure that it is a tuple of length 2
                vs = (vs[0], [])

            # wrap the tuple in a list
            vs = [vs]
        elif isinstance(vs, str):
            # turn a single string warning into a canonical warning
            vs = [(vs, [])]

        for v in vs:
            if isinstance(v, str):
                # vs might be just a list of string
                # so convert each item into a tuple
                v = (v, [])
            serialized.append({'key': k, 'format': v[0], 'args': v[1] })
    return serialized

def has_errors(error_dict):
    has_errors = False
    for error in error_dict.values():
        has_errors = has_errors or bool(error)
    return has_errors

def dict_remove_falsy_entries(dict: dict):
    for key in list(dict.keys()):
        if not dict[key]:
            del dict[key]

def fit_string_with_ellipsis_in_middle(string: str, max_length: int, ellipsis = "...") -> str:
    if max_length <= 0:
        raise Exception(f"The max_length ({max_length}) must be greater than 0.")
    if max_length <= len(ellipsis):
        raise Exception(f"The max_length ({max_length}) is too short for the ellipsis '{ellipsis}'.")

    remove_count = len(string) - max_length
    if remove_count > 0:
        remove_count = remove_count + len(ellipsis)

        middle_index = math.floor(len(string) / 2)
        left_remove_count = math.floor(remove_count / 2)
        right_remove_count = math.ceil(remove_count / 2)

        left = string[:middle_index][:-left_remove_count]
        right = string[middle_index:][right_remove_count:]

        return f"{left}{ellipsis}{right}"
    else:
        return string
