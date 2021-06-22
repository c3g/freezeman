from django.core.exceptions import ValidationError
from django.test import TestCase
from fms_core.models import PropertyType, Protocol, Container
from fms_core.tests.constants import create_container

class PropertyTypeTest(TestCase):
    def setUp(self):
        self.protocol, _ = Protocol.objects.get_or_create(name="ProtocolTest")
        self.name = "First property type"
        self.property_type = PropertyType.objects.create(name=self.name,
                                                         value_type="str",
                                                         content_object=self.protocol)

    def test_property_type(self):
        name = "Test property type"
        content_object = self.protocol
        pt = PropertyType.objects.create(name=name,
                                         value_type="str",
                                         content_object=content_object)
        self.assertEqual(pt.name, name)
        self.assertEqual(pt.content_object, content_object)

    def test_duplicate_name(self):
        with self.assertRaises(ValidationError):
            try:
                PropertyType.objects.create(name=self.name, value_type="str", content_object=self.protocol)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_invalid_value_type(self):
        name = "Test_invalid_value_type"
        content_object = self.protocol
        with self.assertRaises(ValidationError):
            try:
                PropertyType.objects.create(name=name, value_type="invalid_type_test", content_object=content_object)
            except ValidationError as e:
                self.assertTrue('value_type' in e.message_dict)
                raise e

    def test_invalid_content_object(self):
        name = "Test_invalid_value_type"
        content_object = Container.objects.create(**create_container(barcode='INVALIDPROPERTYTYPE'))
        with self.assertRaises(ValidationError):
            try:
                PropertyType.objects.create(name=name, value_type="invalid_content_object", content_object=content_object)
            except ValidationError as e:
                self.assertTrue('content_object' in e.message_dict)
                raise e

    def test_missing_name(self):
        content_object = self.protocol
        with self.assertRaises(ValidationError):
            try:
                PropertyType.objects.create(value_type="invalid_content_object", content_object=content_object)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_missing_value_type(self):
        name = "missing_value_type"
        content_object = self.protocol
        with self.assertRaises(ValidationError):
            try:
                PropertyType.objects.create(name=name, content_object=content_object)
            except ValidationError as e:
                self.assertTrue('value_type' in e.message_dict)
                raise e

    def test_missing_content_object(self):
        name = "missing_content_object"
        with self.assertRaises(ValidationError):
            try:
                PropertyType.objects.create(name=name, value_type="invalid_content_object")
            except ValidationError as e:
                self.assertTrue('content_type' in e.message_dict)
                raise e