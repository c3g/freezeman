import re
import unicodedata

from datetime import datetime
from decimal import Decimal
from typing import Optional, Union


__all__ = [
    "RE_SEPARATOR",
    "RE_WHITESPACE",

    "blank_str_to_none",
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


def blank_str_to_none(s):
    return None if s == "" else s


def create_volume_history(update_type: str, volume_value: str, extracted_sample_id: Optional[int] = None):
    return {
        "update_type": update_type,
        "volume_value": str(Decimal(volume_value)),
        "date": datetime.utcnow().isoformat() + "Z",
        **({"extracted_sample_id": extracted_sample_id} if extracted_sample_id is not None else {})
    }


def check_truth_like(string: str) -> bool:
    """
    Checks if a string contains a "truth-like" value, e.g. true, yes, etc.
    """
    return str_normalize(string).upper() in ("TRUE", "T", "YES", "Y")


def float_to_decimal(n: Union[float, str], decimals: int = 3) -> Decimal:
    tpl = f"{{:.{decimals}f}}"
    return Decimal(tpl.format(float(n)))


def normalize_scientific_name(name: str) -> str:
    # Converts (HOMO SAPIENS or Homo Sapiens or ...) to Homo sapiens
    return " ".join((a.title() if i == 0 else a.lower()) for i, a in enumerate(RE_WHITESPACE.split(name)))


def str_normalize(s: str) -> str:
    return unicodedata.normalize("NFC", s.strip())


def str_cast_and_normalize(s) -> str:
    return str_normalize(str(s))


def get_normalized_str(d: dict, key: str, default: str = "") -> str:
    return str_cast_and_normalize(d.get(key) or default)
