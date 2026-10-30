import logging
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo


class LocalTimeFormatter(logging.Formatter):
    """Log formatter that writes the time stamp in a given IANA time zone.

    Without `datefmt`, the time stamp is `YYYY-MM-DD HH:MM:SS,mmm±HHMM`: the default of the
    standard library plus the UTC offset.
    """

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
            datefmt: `strftime` format. If `None`, use the default format with the offset.

        Returns:
            The formatted time stamp.
        """
        moment = datetime.fromtimestamp(record.created, self.tz)
        if datefmt:
            return moment.strftime(datefmt)
        return f"{moment:%Y-%m-%d %H:%M:%S},{int(record.msecs):03d}{moment:%z}"
