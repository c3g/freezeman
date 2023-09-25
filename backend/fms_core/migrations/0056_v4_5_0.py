import reversion
from django.contrib.auth.models import User

from django.conf import settings
from django.db import migrations
from fms_core.models._constants import SampleType

ADMIN_USERNAME = 'biobankadmin'

def create_normalization_genotyping_step(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    Step = apps.get_model("fms_core", "Step")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create normalization (Genotyping) step and specification.")
        reversion.set_user(admin_user)

        STEPS = [
            # {name, protocol_name}
            {"name": "Normalization (Library)", "protocol_name": "Normalization", "expected_sample_type": SampleType.LIBRARY,
             "specifications": [{"display_name": "Normalization Type", "sheet_name": "Normalization", "column_name": "Type", "value": "Library"}]},
            {"name": "Normalization (Genotyping)", "protocol_name": "Normalization", "expected_sample_type": SampleType.EXTRACTED_SAMPLE,
             "specifications": [{"display_name": "Normalization Type", "sheet_name": "Normalization", "column_name": "Type", "value": "Genotyping"}]},
        ]

        # Create Step and specification
        for step_info in STEPS:
            protocol = Protocol.objects.get(name=step_info["protocol_name"])

            step = Step.objects.create(name=step_info["name"],
                                       protocol=protocol,
                                       expected_sample_type=step_info["expected_sample_type"],
                                       created_by_id=admin_user_id,
                                       updated_by_id=admin_user_id)

            reversion.add_to_revision(step)

            for specification in step_info["specifications"]:
                step_specification = StepSpecification.objects.create(display_name=specification["display_name"],
                                                                      sheet_name=specification["sheet_name"],
                                                                      column_name=specification["column_name"],
                                                                      value=specification["value"],
                                                                      step=step,
                                                                      created_by_id=admin_user_id,
                                                                      updated_by_id=admin_user_id)

                reversion.add_to_revision(step_specification)


def initialize_axiom_sample_preparation(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    ProtocolBySubprotocol = apps.get_model("fms_core", "ProtocolBySubprotocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Step = apps.get_model("fms_core", "Step")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create objects for Axiom Sample Preparation.")
        reversion.set_user(admin_user)

        # Create PropertyType and Protocols
        PROPERTY_TYPES_BY_PROTOCOL = {
            "Axiom Sample Preparation": [],
            "Axiom: Amplification":     [("Axiom Module 1 Barcode", "str"),
                                         ("Incubation Time In Amplification", "str"),
                                         ("Incubation Time Out Amplification", "str"),
                                         ("Liquid Handler Instrument Amplification", "str"),
                                         ("Stored Before Fragmentation", "str"),
                                         ("Comment Amplification", "str"),
                                        ],
            "Axiom: Fragmentation":     [("Axiom Module 2.1 Barcode Fragmentation", "str"),
                                         ("Axiom Module 2.2 Barcode Fragmentation", "str"),
                                         ("Liquid Handler Instrument Fragmentation", "str"),
                                         ("Comment Fragmentation", "str"),
                                        ],
            "Axiom: Precipitation": [("Axiom Module 2.1 Barcode Precipitation", "str"),
                                     ("Axiom Module 2.2 Barcode Precipitation", "str"),
                                     ("Liquid Handler Instrument Precipitation", "str"),
                                     ("Comment Precipitation", "str"),
                                    ],
        }
        SUBPROTOCOLS_BY_PROTOCOL = {
            "Axiom Sample Preparation": ["Axiom: Amplification",
                                         "Axiom: Fragmentation",
                                         "Axiom: Precipitation",]
        }
        STEP = [
            # {name, protocol_name}
            {"name": "Axiom Sample Preparation", "protocol_name": "Axiom Sample Preparation", "expected_sample_type": SampleType.EXTRACTED_SAMPLE},
        ]

        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        # Create protocols and properties
        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name,
                                               created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            for (property, value_type) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                is_optional = True if 'comment' in property.lower() else False

                pt = PropertyType.objects.create(name=property,
                                                 object_id=protocol.id,
                                                 content_type=protocol_content_type,
                                                 value_type=value_type,
                                                 is_optional=is_optional,
                                                 created_by_id=admin_user_id, updated_by_id=admin_user_id)
                reversion.add_to_revision(pt)

        # Attach subprotocols to parent protocol
        for protocol_name in SUBPROTOCOLS_BY_PROTOCOL.keys():
            parent = Protocol.objects.get(name=protocol_name)
            for subprotocol_name in SUBPROTOCOLS_BY_PROTOCOL[protocol_name]:
                child = Protocol.objects.get(name=subprotocol_name)
                protocolbysubprotocol = ProtocolBySubprotocol.objects.create(child=child, parent=parent,
                                                                             created_by_id=admin_user_id, updated_by_id=admin_user_id)
                reversion.add_to_revision(protocolbysubprotocol)  

        # Create Step
        for step_info in STEP:
            protocol = Protocol.objects.get(name=step_info["protocol_name"])

            step = Step.objects.create(name=step_info["name"],
                                       protocol=protocol,
                                       expected_sample_type=step_info["expected_sample_type"],
                                       created_by_id=admin_user_id,
                                       updated_by_id=admin_user_id)
            reversion.add_to_revision(step)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0055_v4_5_0'),
    ]

    operations = [
        migrations.RunPython(
            create_normalization_genotyping_step,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            initialize_axiom_sample_preparation,
            reverse_code=migrations.RunPython.noop,
        ),
    ]