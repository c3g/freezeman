import logging
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo


class LocalTimeFormatter(logging.Formatter):
    """Log formatter that writes the timestamp in a given IANA time zone.

    Without `datefmt`, the timestamp is `YYYY-MM-DD HH:MM:SS,ffffff±HHMM`: the default of the
    standard library with microseconds and the UTC offset.
    """

    DEFAULT_DATEFMT = "%Y-%m-%d %H:%M:%S,%f%z"

    def __init__(self, *args, tz: str, **kwargs) -> None:
        """
        Args:
            tz: IANA name of the time zone, for example `America/Montreal`.
        """
        super().__init__(*args, **kwargs)
        self.tz = ZoneInfo(tz)

    # Django sets the process time zone to TIME_ZONE (UTC), so the standard `localtime` converter gives UTC.
    def formatTime(self, record: logging.LogRecord, datefmt: Optional[str] = None) -> str:
        """Format `record.created` in the time zone of the formatter.

        Args:
            record: The log record.
            datefmt: `strftime` format. If `None`, use `DEFAULT_DATEFMT`.

        Returns:
            The formatted timestamp of the log record.
        """
        log_datetime = datetime.fromtimestamp(record.created, self.tz)
        return log_datetime.strftime(datefmt or self.DEFAULT_DATEFMT)
