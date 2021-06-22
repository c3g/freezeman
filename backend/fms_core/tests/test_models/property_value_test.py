from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.test import TestCase
from fms_core.models import PropertyValue, PropertyType, Protocol, Process


class PropertyValueTest(TestCase):
    def setUp(self):
        self.protocol, _ = Protocol.objects.get_or_create(name="ProtocolTest")
        self.property_type_with_str = PropertyType.objects.create(name="PropertyNameTestStr",
                                                                   value_type="str",
                                                                   content_object=self.protocol)
        self.property_type_with_int = PropertyType.objects.create(name="PropertyNameTestInt",
                                                                            value_type="int",
                                                                            content_object=self.protocol)
        self.process, _ = Process.objects.get_or_create(protocol=self.protocol)

    def test_property_value(self):
        content_object = self.process
        value = 10.1
        property_type_with_float = PropertyType.objects.create(name="PropertyNameTestFloat",
                                                               value_type="float",
                                                               content_object=self.protocol)
        pv = PropertyValue.objects.create(value=value,
                                          property_type=property_type_with_float,
                                          content_object=content_object)

        self.assertEqual(pv.property_type, property_type_with_float)
        self.assertEqual(pv.content_object, content_object)
        self.assertEqual(pv.value, value)
        self.assertEqual(type(pv.value).__name__, pv.property_type.value_type)

    def test_incorrect_json_value_schema(self):
        content_object = self.process
        value = "testtest"
        with self.assertRaises(ValidationError):
            try:
                PropertyValue.objects.create(value=[value, value],
                                             property_type=self.property_type_with_str,
                                             content_object=content_object)
            except ValidationError as e:
                self.assertTrue('value' in e.message_dict)
                raise e


    def test_value_type_mismatch(self):
        content_object = self.process
        value = "value_type_string_instead_of_integer"

        with self.assertRaises(ValidationError):
            try:
                PropertyValue.objects.create(value=value,
                                             property_type=self.property_type_with_int,
                                             content_object=content_object)
            except ValidationError as e:
                self.assertTrue('value' in e.message_dict)
                raise e

    def test_missing_value(self):
        content_object = self.process
        with self.assertRaises(ValidationError):
            try:
                PropertyValue.objects.create(property_type=self.property_type_with_int,
                                             content_object=content_object)
            except ValidationError as e:
                self.assertTrue('value' in e.message_dict)
                raise e

    def test_missing_property_type(self):
        content_object = self.process
        value = "test_with_missing_property_type"
        with self.assertRaises(ObjectDoesNotExist):
            try:
                PropertyValue.objects.create(value=value, content_object=content_object)
            except ObjectDoesNotExist as e:
                raise e

    def test_missing_content_object(self):
        value = "missing_content_object"
        with self.assertRaises(ValidationError):
            try:
                PropertyValue.objects.create(value=value,
                                             property_type=self.property_type_with_str)
            except ValidationError as e:
                self.assertTrue('content_type' in e.message_dict)
                raise e

    def test_incorrect_content_object_class(self):
        content_object = self.property_type_with_int
        value = "incorrect_content_object"

        with self.assertRaises(ValidationError):
            try:
                PropertyValue.objects.create(value=value,
                                             property_type=self.property_type_with_str,
                                             content_object=content_object)
            except ValidationError as e:
                self.assertTrue('content_type' in e.message_dict)
                raise e