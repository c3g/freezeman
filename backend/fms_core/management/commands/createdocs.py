from typing import Any, Optional
from django.core.management.base import BaseCommand, CommandParser

class Command(BaseCommand):
    help = "Generates documentation for python modules"

    def add_arguments(self, parser: CommandParser) -> None:
        from fms.settings import BASE_DIR

        parser.add_argument(
            "--output",
            help="The directory to output generated documents to (default: ./docs)",
            type=str,
            default=f"{BASE_DIR}/docs"
        )
        parser.add_argument(
            "modules",
            help="The Python module name. This may be an import path resolvable in "
            "the current environment, or a file path to a Python module or "
            "package.",
            nargs="+",
            type=str
        )
    
    def handle(self, *args: Any, **options: Any) -> Optional[str]:        
        from pdoc.cli import main, parser

        cmdline_args = [
            "--html",
            "-o" ,
            options["output"],
            "--config",
            "show_source_code=False",
            "--force",
        ] + options["modules"]

        main(parser.parse_args(cmdline_args))
