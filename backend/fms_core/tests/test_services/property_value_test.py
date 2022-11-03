
from django.test import TestCase

from fms_core.models import PropertyType, Protocol, Container, SampleKind

from fms_core.services.property_value import (validate_non_optional_properties, 
                                              create_process_measurement_properties,
                                              create_process_properties,)
from fms_core.services.process import create_process
from fms_core.services.process_measurement import create_process_measurement
from fms_core.services.sample import create_full_sample

class PropertyValueServicesTestCase(TestCase):
    def setUp(self) -> None:
        self.protocol_name_for_pm = "Library Quality Control"
        self.protocol_obj_for_pm = Protocol.objects.get(name=self.protocol_name_for_pm)
        self.property_dict_for_pm = {
            "Measured Volume (uL)": {"property_type_obj": None, "value": 100,},
            "Concentration (ng/uL)": {"property_type_obj": None, "value": 10,},
            "Library Size (bp)": {"property_type_obj": None, "value": None,},
        }
        self.property_dict_invalid = {
            "Measured Volume (uL)": {"property_type_obj": None, "value": None,},
            "Concentration (ng/uL)": {"property_type_obj": None, "value": 10,},
            "Library Size (bp)": {"property_type_obj": None, "value": None,},
        }
        for property_type_name, dict  in self.property_dict_for_pm.items():
            dict["property_type_obj"] = PropertyType.objects.get(name=property_type_name, object_id=self.protocol_obj_for_pm.id)
        for property_type_name, dict  in self.property_dict_invalid.items():
            dict["property_type_obj"] = PropertyType.objects.get(name=property_type_name, object_id=self.protocol_obj_for_pm.id)

        self.protocol_name_for_process = "DNBSEQ Preparation"
        self.protocol_obj_for_process = Protocol.objects.get(name=self.protocol_name_for_process)
        self.property_dict_for_process = {
            "Flowcell Lot": {"property_type_obj": None, "value": "1",},
            "Loading Method": {"property_type_obj": None, "value": "2",},
            "Sequencer Side": {"property_type_obj": None, "value": "3",},
            "Sequencer Kit Used": {"property_type_obj": None, "value": "4",},
            "Sequencer Kit Lot": {"property_type_obj": None,  "value": "5",},
            "Load DNB Cartridge Lot": {"property_type_obj": None, "value": "6",},
            "Primer Kit": {"property_type_obj": None, "value": "7",},
            "Primer Kit Lot": {"property_type_obj": None, "value": "8",},
            "Read 1 Cycles": {"property_type_obj": None, "value": "9",},
            "Read 2 Cycles": {"property_type_obj": None, "value": "10",},
            "Index 1 Cycles": {"property_type_obj": None, "value": "11",},
            "Index 2 Cycles": {"property_type_obj": None, "value": "12",},
        }
        for property_type_name, dict  in self.property_dict_for_process.items():
            dict["property_type_obj"] = PropertyType.objects.get(name=property_type_name, object_id=self.protocol_obj_for_process.id)
            
    def test_validate_non_optional_properties(self):
        is_valid, errors, warnings = validate_non_optional_properties(self.property_dict_for_pm)
        self.assertTrue(is_valid)
        self.assertFalse(errors)
        self.assertFalse(warnings)
        is_valid, errors, warnings = validate_non_optional_properties(self.property_dict_invalid)
        self.assertFalse(is_valid)
        self.assertTrue(errors)
        self.assertFalse(warnings)

    def test_create_process_measurement_properties(self):
        test_container = Container.objects.create(barcode="TESTBARCODE",
                                                  name="TestName",
                                                  kind="tube")
        kind_dna = SampleKind.objects.get(name="DNA")
        process_by_protocol_qc, _, _ = create_process(self.protocol_obj_for_pm)
        test_sample, _, _ = create_full_sample(name="SampleTest",
                                               volume=200,
                                               collection_site="TestSite",
                                               creation_date="2022-10-01",
                                               container=test_container,
                                               sample_kind=kind_dna,
                                               concentration=10)
        pm_qc, _, _ = create_process_measurement(process=process_by_protocol_qc[self.protocol_obj_for_pm.id],
                                                 source_sample=test_sample,
                                                 execution_date="2022-10-21",
                                                 volume_used=10)
        values, errors, warnings = create_process_measurement_properties(self.property_dict_for_pm, pm_qc)
        self.assertEqual(len(values), 2)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_create_process_properties(self):
        process_by_protocol_dnbseq, _, _ = create_process(protocol=self.protocol_obj_for_process,
                                                          creation_comment="This is a test",
                                                          create_children=True,)
        values, errors, warnings = create_process_properties(self.property_dict_for_process, process_by_protocol_dnbseq)
        self.assertEqual(len(values), 12)
        self.assertFalse(errors)
        self.assertFalse(warnings)