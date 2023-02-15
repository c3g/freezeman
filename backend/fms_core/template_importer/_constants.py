# Normalization planning
SAMPLE_BIOMEK_CHOICE = "Sample Biomek"
SAMPLE_JANUS_CHOICE = "Sample Janus"
LIBRARY_CHOICE = "Library"
VALID_NORM_CHOICES = [SAMPLE_BIOMEK_CHOICE, SAMPLE_JANUS_CHOICE, LIBRARY_CHOICE]
# Index validation
DEFAULT_INDEX_VALIDATION_THRESHOLD = 2
INDEX_COLLISION_THRESHOLD = 0
# Workflow step actions
NEXT_STEP = "Step complete - Move to next step"
DEQUEUE_SAMPLE = "Sample failed - Remove sample from study workflow"
IGNORE_WORKFLOW = "Ignore workflow - Do not register as part of a workflow"