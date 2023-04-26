from django.db import models
import reversion

from .tracked_model import TrackedModel
from .dataset import Dataset

from ._constants import STANDARD_NAME_FIELD_LENGTH

@reversion.register()
class Readset(TrackedModel):
    """ Class to store information about the derived sample data extracted during a single run and lane. """
    dataset = models.ForeignKey(Dataset, on_delete=models.PROTECT, help_text="The dataset of the readfile.", related_name="readsets")
    sample_name = models.CharField(max_length=STANDARD_NAME_FIELD_LENGTH, help_text="The sample name that identifies the readset if the run did not come from Freezeman.")
    