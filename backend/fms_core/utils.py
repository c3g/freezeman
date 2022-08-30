import decimal
import re
import unicodedata

import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Generator, Iterable, List, Union


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


def is_date_or_time_after_today(date: datetime.datetime) -> Union[bool, None]: 
    if not isinstance(date, datetime.date):
        return None
    return datetime.datetime.combine(date, datetime.datetime.min.time()) > datetime.datetime.now()
    

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

def make_generator(obj: Union[Any, None, Iterable[Any]]) -> Generator[Any, None, None]:
    """
    Ensures that ManyToMany fields such as the `obj` passed are iterable.
    None is turned into an empty iterable,
    non-None objects are turned into an iterable with a single element,
    and iterable objects remain the same.
    It's meant to handle the fact that a ManyToMany field is not a list if it has less than two elements.

    Args:
        obj: Any

    Returns:
        `Generator[Any, None, None]`

    Yields:
        `Any`
    """

    if obj is None:
        return
    else:
        try:
            for x in obj:
                yield x
        except TypeError:
            yield obj
