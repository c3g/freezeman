import reversion
from django.contrib.auth.models import User
from django.db import migrations
from fms_core.models._constants import SampleType

ADMIN_USERNAME = 'biobankadmin'

def create_axiom_experiment_run_related_objects(apps, scheme_editor):
    Platform = apps.get_model("fms_core", "Platform")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")
    Instrument = apps.get_model("fms_core", "Instrument")
    RunType = apps.get_model("fms_core", "RunType")
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Step = apps.get_model("fms_core", "Step")
    ProtocolBySubprotocol = apps.get_model("fms_core", "ProtocolBySubprotocol")
    Workflow = apps.get_model("fms_core", "Workflow")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id
        
        # Create Platform and InstrumentType
        platform = Platform.objects.create(name="AXIOM_ARRAY", created_by_id=admin_user_id, updated_by_id=admin_user_id)
        reversion.add_to_revision(platform)

        # DICT { TYPE : PLATFORM }
        INSTRUMENT_TYPES = {
            "GeneTitan MC": "AXIOM_ARRAY",
        }
        for type in INSTRUMENT_TYPES:
            platform = Platform.objects.get(name=INSTRUMENT_TYPES[type])
            it = InstrumentType.objects.create(platform=platform,
                                               type=type,
                                               created_by_id=admin_user_id,
                                               updated_by_id=admin_user_id)

            reversion.add_to_revision(it)

        # Create Instruments
        INSTRUMENTS = {
            "Protected": {
                "type" : "GeneTitan MC",
                "serial_id" : "GeneTitan_Protected"
            },
            "OnNetwork": {
                "type" : "GeneTitan MC",
                "serial_id" : "GeneTitan_OnNetwork"
            },
        }
        for name in INSTRUMENTS.keys():
            it = InstrumentType.objects.get(type=INSTRUMENTS[name]["type"])
            i = Instrument.objects.create(name=name,
                                          type=it,
                                          serial_id=INSTRUMENTS[name]["serial_id"],
                                          created_by_id=admin_user_id,
                                          updated_by_id=admin_user_id)
            reversion.add_to_revision(i)

        # Create PropertyType and Protocols
        PROPERTY_TYPES_BY_PROTOCOL = {
            "Axiom Experiment Run": [],
            "Axiom: Denaturation and Hybridization": [("Denaturation and Hybridization Comment", "str")],
            "Axiom: GeneTitan Reagent Preparation": [("Axiom Module 4.1 Barcode", "str"),
                                                     ("Axiom Module 4.2 Barcode", "str"),
                                                     ("Liquid Handler Instrument Reagent Preparation", "str"),
                                                     ("Reagent Preparation Comment", "str"),
                                                     ],
        }
        SUBPROTOCOLS_BY_PROTOCOL = {
            "Axiom Experiment Run": ["Axiom: Denaturation and Hybridization",
                                         "Axiom: GeneTitan Reagent Preparation",]
        }
        
        
        protocol_content_type = ContentType.objects.get_for_model(Protocol)

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
        STEP = [
            # {name, protocol_name}
            {"name": "Axiom Experiment Run", "protocol_name": "Axiom Experiment Run", "expected_sample_type": SampleType.EXTRACTED_SAMPLE},
        ]
        
        for step_info in STEP:
            protocol = Protocol.objects.get(name=step_info["protocol_name"])

            step = Step.objects.create(name=step_info["name"],
                                       protocol=protocol,
                                       expected_sample_type=step_info["expected_sample_type"],
                                       created_by_id=admin_user_id,
                                       updated_by_id=admin_user_id)
            reversion.add_to_revision(step)
        
        # Create RunType Axiom
        rt = RunType.objects.create(name="Axiom",
                                    platform=platform,
                                    protocol=protocol,
                                    needs_run_processing=False,
                                    created_by_id=admin_user_id,
                                    updated_by_id=admin_user_id)
        reversion.add_to_revision(rt)

        WORKFLOWS = [
            ("Axiom", "Axiom", ["Axiom Experiment Run"])
        ]

        for name, structure, step_names in WORKFLOWS:
            workflow = Workflow.objects.create(name=name,
                                               structure=structure,
                                               created_by_id=admin_user_id,
                                               updated_by_id=admin_user_id)
            next_step_order = None
            for i, step_name in enumerate(reversed(step_names)):
                step = Step.objects.get(name=step_name)
                order = len(step_names) - i
                step_order = StepOrder.objects.create(workflow=workflow,
                                                      step=step,
                                                      next_step_order=next_step_order,
                                                      order=order,
                                                      created_by_id=admin_user_id,
                                                      updated_by_id=admin_user_id)
                next_step_order = step_order

                reversion.add_to_revision(step_order)

class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0058_v4_5_0'),
    ]
    operations = [
        migrations.RunPython(
            create_axiom_experiment_run_related_objects,
            reverse_code=migrations.RunPython.noop,
        ),
    ]