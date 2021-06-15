from django.test import TestCase

import json
import reversion

from fms_core.models import Container
from fms_core.tests.constants import create_container


class TrackedTest(TestCase):
    """ Test module for tracked_model abstract model. """

    def setUp(self):
        pass
        # from ..signals import register_signal_handlers
        # register_signal_handlers()

    def test_tracked_fields(self):
        # Uses container child to test base class functionality
        Container.objects.create(**create_container(barcode='ZZZ1313', name='BigBrother'))
        created_valid_container = Container.objects.get(name='BigBrother')
        self.assertEqual(created_valid_container.barcode, 'ZZZ1313')
        self.assertEqual(created_valid_container.created_by.username, 'biobankadmin') # tests for biobankadmin user which is the default user
        self.assertIsNotNone(created_valid_container.created_at) # tests if the create time is set
        self.assertEqual(created_valid_container.updated_by.username, 'biobankadmin') # tests for biobankadmin user which is the default user
        self.assertIsNotNone(created_valid_container.updated_at) # tests if the updated time is set
        old_update_time = created_valid_container.updated_at
        created_valid_container.name = 'LilBrother'
        created_valid_container.save()
        self.assertGreater(created_valid_container.updated_at, old_update_time) # tests if the update time is updated

    def test_saved_revision_on_delete(self):
        # Test is the a version is saved on deletion of the object
        with reversion.create_revision():
            Container.objects.create(**create_container(barcode='ZZZ3131', name='ghostContainer'))
        created_valid_container = Container.objects.get(name='ghostContainer')
        container_id = str(created_valid_container.id)
        initial_container_version = reversion.models.Version.objects.filter(object_id=container_id).first()
        data = json.loads(initial_container_version.serialized_data)
        isDeleted = data[0]["fields"].pop("deleted", True)
        self.assertEqual(isDeleted, False)

        Container.objects.get(id=container_id).delete()
        deleted_container_version = reversion.models.Version.objects.filter(object_id=container_id).first()
        data = json.loads(deleted_container_version.serialized_data)
        isDeleted = data[0]["fields"].pop("deleted", False)
        self.assertEqual(isDeleted, True)