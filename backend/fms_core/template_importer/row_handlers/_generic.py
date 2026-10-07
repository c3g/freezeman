from typing import Any, Protocol, TypedDict

from django.core.exceptions import ValidationError
from collections import defaultdict

from fms_core.utils import SerializedWarning, Warnings, serialize_warnings

'''
    RowHandler objects
    An object inheriting from RowHandler() should be created for each different 'type' of row 
    (the 'type' being determined by a unique combination of columns)
    validate_input (input):
        verify that input provided by the user are compatible with the row handler operation.
        returns errors helpful to the user.
    process_row (input): 
        row data obtained from the Importer objects.
    get_result (output): 
        A row result dictionary containing errors, validation error, warnings, and row data 
'''


class GenericRowHandler[RowObject]():
    def __init__(self):
        self.errors: defaultdict[str, list[str] | str] = defaultdict(list)
        self.warnings: Warnings = defaultdict(list)
        # optional - in case the Importer needs the current row main object from the RowHandler
        self.row_object: RowObject | None = None

    def validate_row_input(self, *args: Any, **kwargs: Any) -> None:
        pass # no validation is done by default

    def has_errors(self) -> bool:
        has_errors = False
        for error in self.errors.values():
            has_errors = has_errors or bool(error)
        return has_errors

    def process_row(self, *args: Any, **kwargs: Any) -> Result:
        if kwargs["is_empty_row"]:
            self.warnings["Template"] = f"Empty template row."
        elif not self.errors:
            kwargs.pop("is_empty_row")
            self.validate_row_input(**kwargs)
            self.process_row_inner(**kwargs)
        result = self.get_result()
        return result

    def process_row_inner(self, *args: Any, **kwargs: Any) -> None:
        raise NotImplementedError("process_row_inner() must be implemented in the subclass")

    class Result(TypedDict):
        errors: list[str | Exception]
        validation_error: ValidationError
        warnings: list[SerializedWarning]

    def get_result(self) -> Result:
        warnings = serialize_warnings(self.warnings)
        return {'errors': [], 'validation_error': ValidationError(self.errors), 'warnings': warnings}


class RowHandlerProtocol[RowObject, **RowInputs](Protocol):
    """
    Structural view of a GenericRowHandler subclass. RowInputs is inferred from the subclass's
    process_row_inner signature so that Importer.handle_row can type-check the inputs it forwards.
    """
    @property
    def row_object(self) -> RowObject | None: ...

    def __init__(self) -> None: ...

    def process_row(self, *args: Any, **kwargs: Any) -> GenericRowHandler.Result: ...

    def process_row_inner(self, *args: RowInputs.args, **kwargs: RowInputs.kwargs) -> None: ...
