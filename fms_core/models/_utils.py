from django.core.exceptions import ValidationError

__all__ = ["add_error"]


def add_error(errors: dict, field: str, error: ValidationError):
    errors[field] = [*errors.get(field, []), error]
