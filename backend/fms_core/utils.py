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

    "VolumeHistoryUpdateType",
    "create_volume_history",

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


class VolumeHistoryUpdateType(Enum):
    """
    Enumerated values for the types of updates that can occur in the
    volume_history property of Sample objects, which represent alterations
    to a sample's volume.
    """
    UPDATE = "update"
    EXTRACTION = "extraction"


def create_volume_history(update_type: VolumeHistoryUpdateType,
                          volume_value: str,
                          extracted_sample_id: Optional[int] = None):
    """
    Given an update type, new volume value (a string compatible with being
    casted to a Decimal), and (in the case of an 'extraction' update) a
    sample ID corresponding to the extracted sample which consumed some of the
    volume of the sample being updated.
    """

    # If sample ID were to become a UUID in the future, this would have to be
    # altered (int cast removed, signature changed.)

    assert isinstance(update_type, VolumeHistoryUpdateType)

    if update_type == VolumeHistoryUpdateType.EXTRACTION and extracted_sample_id is None:
        raise ValueError("An extracted sample ID must be specified if the volume history entry is of type extraction")

    return {
        "update_type": update_type.value,
        "volume_value": str(Decimal(volume_value)),
        "date": datetime.utcnow().isoformat() + "Z",
        **({"extracted_sample_id": int(extracted_sample_id)} if extracted_sample_id is not None else {})
    }


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
    return " ".join((a.title() if i == 0 else a.lower()) for i, a in enumerate(RE_WHITESPACE.split(name)))


def str_normalize(s: str) -> str:
    """
    Normalizes the Unicode characters of and strips a string.
    """
    return unicodedata.normalize("NFC", s.strip())


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


def timezone_to_str(timezone=timezone.now) -> str:
    return timezone.localtime(timezone).strftime("%Y-%m-%d %H:%M:%S")