from django.test import TestCase

import datetime

from fms_core.services.report import TimeWindow, get_date_range_with_window, human_readable_time_window


class ReportServicesTestCase(TestCase):
    def setUp(self) -> None:
        pass

    def test_get_date_range_with_window(self):
        date_list, window_list = get_date_range_with_window(start_date="2024-11-30",
                                                            end_date="2024-12-01",
                                                            time_window=TimeWindow.MONTHLY)
        self.assertEqual(date_list, [datetime.date(2024, 11, 30).isoformat(), datetime.date(2024, 12, 1).isoformat()])
        self.assertEqual(window_list, [datetime.date(2024, 11, 1).isoformat(), datetime.date(2024, 12, 1).isoformat()])

        date_list, window_list = get_date_range_with_window(start_date="2024-11-30",
                                                            end_date="2024-12-01",
                                                            time_window=TimeWindow.WEEKLY)
        self.assertEqual(date_list, [datetime.date(2024, 11, 30).isoformat(), datetime.date(2024, 12, 1).isoformat()])
        self.assertEqual(window_list, [datetime.date(2024, 11, 25).isoformat(), datetime.date(2024, 11, 25).isoformat()])

        date_list, window_list = get_date_range_with_window(start_date="2024-11-30",
                                                            end_date="2024-12-01",
                                                            time_window=TimeWindow.DAILY)
        self.assertEqual(date_list, [datetime.date(2024, 11, 30).isoformat(), datetime.date(2024, 12, 1).isoformat()])
        self.assertEqual(window_list, [datetime.date(2024, 11, 30).isoformat(), datetime.date(2024, 12, 1).isoformat()])

    def test_human_readable_time_window(self):
        label = human_readable_time_window(date="2024-11-30", time_window=TimeWindow.MONTHLY)
        self.assertEqual(label, "November 2024")

        label = human_readable_time_window(date="2024-01-30", time_window=TimeWindow.WEEKLY)
        self.assertEqual(label, "Week-05 2024")

        label = human_readable_time_window(date="2024-01-30", time_window=TimeWindow.DAILY)
        self.assertEqual(label, "2024-01-30")