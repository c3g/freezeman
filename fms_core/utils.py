import re
import unicodedata


__all__ = [
    "RE_SEPARATOR",
    "RE_WHITESPACE",

    "check_truth_like",
    "normalize_scientific_name",
    "str_normalize",
]


RE_SEPARATOR = re.compile(r"[,;]\s*")
RE_WHITESPACE = re.compile(r"\s+")


def check_truth_like(string: str) -> bool:
    """
    Checks if a string contains a "truth-like" value, e.g. true, yes, etc.
    """
    return str_normalize(string).upper() in ("TRUE", "T", "YES", "Y")


def normalize_scientific_name(name: str) -> str:
    # Converts (HOMO SAPIENS or Homo Sapiens or ...) to Homo sapiens
    return " ".join((a.title() if i == 0 else a.lower()) for i, a in enumerate(RE_WHITESPACE.split(name)))


def str_normalize(s: str):
    return unicodedata.normalize("NFC", s.strip())
