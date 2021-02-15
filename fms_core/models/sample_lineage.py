import reversion

from django.db import models


@reversion.register()
class SampleLineage(models.Model):
    parent = models.ForeignKey("Sample", help_text="Parent sample",
                               on_delete=models.CASCADE, related_name="parent_sample")
    child = models.ForeignKey("Sample", help_text="Child sample",
                              on_delete=models.CASCADE, related_name="child_sample")
