import unicodedata


__all__ = ["str_normalize"]


def str_normalize(s: str):
    return unicodedata.normalize("NFC", s.strip())
