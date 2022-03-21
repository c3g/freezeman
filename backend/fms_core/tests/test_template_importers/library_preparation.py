from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import LibraryPreparationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, SampleKind, ProcessMeasurement, PropertyType, PropertyValue

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample


class LibraryPreparationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = LibraryPreparationImporter()
        self.file = APP_DATA_ROOT / "Library_preparation_v3_8_0.xlsx"
        ContentType.objects.clear_cache()

        self.library_batch_1 = {
            'ID': 'batch_1',
            'Library_type': 'PCR-free',
            'Library_date': '2022-03-15',
            'Platform': 'ILLUMINA',
            'Comment':'comment first batch',
            'Library Technician Name': '',


        }

        self.prefill_data()


    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')

        (container, errors, warnings) = create_container(barcode='CONTAINER4LIBRARYPREP',
                                                         kind='Tube',
                                                         name='Container4LibraryPrep')

        create_full_sample(name=self.sample_name, volume=100, concentration=25, collection_site='TestCaseSite',
                           creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                           container=container, sample_kind=sample_kind)


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        # Sample information tests
        sample = Sample.objects.get(name=self.sample_name)
        self.assertEqual(sample.volume, self.sample_new_volume)
        self.assertEqual(sample.concentration, self.sample_new_concentration)
        self.assertEqual(sample.depleted, self.sample_new_depleted)

        # Process measurement tests
        self.assertTrue(ProcessMeasurement.objects.get(source_sample=sample,
                                            execution_date=self.update_date
                                            ))
        pm = ProcessMeasurement.objects.get(source_sample=sample,
                                            execution_date=self.update_date
                                            )
        self.assertEqual(pm.volume_used, self.process_volume_used)

        self.assertEqual(pm.process.protocol.name, 'Sample Quality Control')

        # Derived sample flag tests
        derived_sample = sample.derived_sample_not_pool
        self.assertEqual(derived_sample.quality_flag, self.quality_flag)
        self.assertEqual(derived_sample.quantity_flag, self.quantity_flag)

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Quantity Instrument', object_id=pm.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm.id)

        pt_2 = PropertyType.objects.get(name='Quality Instrument', object_id=pm.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm.id)

        self.assertEqual(p_1.value, self.process_qt_instrument)
        self.assertEqual(p_2.value, self.process_ql_instrument)




