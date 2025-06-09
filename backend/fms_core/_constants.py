from django.db import models

class WorkflowAction(models.TextChoices):
    NEXT_STEP = "NEXT_STEP", "Step complete - Move to next step"
    DEQUEUE_SAMPLE = "DEQUEUE_SAMPLE", "Sample failed - Remove sample from study workflow"
    REPEAT_STEP = "REPEAT_STEP", "Repeat step - Move to next step and repeat current step"
    IGNORE_WORKFLOW = "IGNORE_WORKFLOW", "Ignore workflow - Do not register as part of a workflow"
    BLOCK_AT_NEXT_STEP = "BLOCK_AT_NEXT_STEP", "Step partially complete - Move to next step and wait for completion"
