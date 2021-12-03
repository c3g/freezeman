import re
import unicodedata

from django.utils import timezone

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional, Union


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
]


RE_SEPARATOR = re.compile(r"[,;]\s*")
RE_WHITESPACE = re.compile(r"\s+")


TRUTH_VALUES = frozenset({"TRUE", "T", "YES", "Y"})


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
    return str_normalize(str(s))


def get_normalized_str(d: dict, key: str, default: str = "") -> str:
    """
    Gets a string-valued item from a dictionary using a provided key. If the
    value is false-y, returns a default string value instead.
    """
    return str_cast_and_normalize(d.get(key) or default)
