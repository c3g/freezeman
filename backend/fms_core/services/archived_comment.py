from fms_core.models import ArchivedComment

from django.db.models import Model
from django.contrib.contenttypes.models import ContentType

def create_archived_comment_for_model(object_model: Model, object_id: int, comment: str):
    """
    Create an archived comment on an instance of a model.

    Args:
        `object_model`: DB Model to be used as anchor for the comment.
        `object_id`: ID of the model instance.
        `comment`: Comment to be archived.

    Returns:
        Tuple including the created archived comment instance as well as a list of errors and warnings.
    """
    archived_comment = None
    errors = []
    warnings = []

    content_type_dataset = ContentType.objects.get_for_model(object_model)
    try:
        archived_comment = ArchivedComment.objects.create(content_type=content_type_dataset, object_id=object_id, comment=comment)
    except object_model.DoesNotExist as err:
        errors.append(f"{str(object_model)} for comment does not exist.")
    except Exception as err:
        errors.append(str(err))
    return archived_comment, errors, warnings