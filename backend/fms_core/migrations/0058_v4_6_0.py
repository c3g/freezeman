import re
import reversion
from django.contrib.auth.models import User

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from fms_core.models._constants import SampleType, StepType
from fms_core.automations._constants import AUTOMATION_CLASS

ADMIN_USERNAME = 'biobankadmin'
def create_axiom_experiment_run_related_objects(apps, schema_editor):
    Platform = apps.get_model("fms_core", "Platform")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")
    Instrument = apps.get_model("fms_core", "Instrument")
    RunType = apps.get_model("fms_core", "RunType")
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Step = apps.get_model("fms_core", "Step")
    ProtocolBySubprotocol = apps.get_model("fms_core", "ProtocolBySubprotocol")

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
                "serial_id" : "E0102900"
            },
            "OnNetwork": {
                "type" : "GeneTitan MC",
                "serial_id" : "E0101520"
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

def move_display_name_to_name(apps, schema_editor):
    StepSpecification = apps.get_model("fms_core", "StepSpecification")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Move display_name to name field and remove spaces.")
        reversion.set_user(admin_user)

        for step_specification in StepSpecification.objects.all():
            step_specification.name = step_specification.display_name.replace(" ", "")
            step_specification.save()
            reversion.add_to_revision(step_specification)

def create_axiom_automation_step(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create Axiom Create Folders automation step and specification.")
        reversion.set_user(admin_user)

        STEPS = [
            # {name, protocol_name}
            {"name": "Axiom Create Folders", "expected_sample_type": SampleType.EXTRACTED_SAMPLE, "type": StepType.AUTOMATION,
             "specifications": [{"name": AUTOMATION_CLASS, "value": "AxiomCreateFolders"}]},
        ]

        # Create Step and specification
        for step_info in STEPS:
            step = Step.objects.create(name=step_info["name"],
                                       expected_sample_type=step_info["expected_sample_type"],
                                       type=step_info["type"],
                                       created_by_id=admin_user_id,
                                       updated_by_id=admin_user_id)

            reversion.add_to_revision(step)

            for specification in step_info["specifications"]:
                step_specification = StepSpecification.objects.create(name=specification["name"],
                                                                      value=specification["value"],
                                                                      step=step,
                                                                      created_by_id=admin_user_id,
                                                                      updated_by_id=admin_user_id)

                reversion.add_to_revision(step_specification)

def initialize_step_history_sample(apps, schema_editor):
    StepHistory = apps.get_model("fms_core", "StepHistory")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Initialize the sample field for pre-existing step history.")
        reversion.set_user(admin_user)

        for step_history in StepHistory.objects.all():
            step_history.sample_id = step_history.process_measurement.source_sample_id
            step_history.save()
            reversion.add_to_revision(step_history)

    assert not StepHistory.objects.filter(sample_id=0).exists()

def create_axiom_workflow(apps, schema_editor):
    Workflow = apps.get_model("fms_core", "Workflow")
    Step = apps.get_model("fms_core", "Step")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create Axiom workflow.")
        reversion.set_user(admin_user)

        WORKFLOWS = [
            # (name, step_names)
            # Test Axiom Automation
            ("Automation Axiom", "Automation Axiom", ["Extraction (DNA)", "Sample QC", "Normalization (Genotyping)", "Axiom Sample Preparation", "Axiom Create Folders", "Axiom Experiment Run"]),
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
        ('fms_core', '0057_v4_5_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='stepspecification',
            name='name',
            field=models.CharField(default='DEFAULT', help_text='Name used to describe the value.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))]),
            preserve_default=False,
        ),
        migrations.RunPython(
            move_display_name_to_name,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='stepspecification',
            name='display_name',
        ),
        migrations.AddField(
            model_name='step',
            name='type',
            field=models.CharField(choices=[('PROTOCOL', 'Protocol'), ('AUTOMATION', 'Automation')], default='PROTOCOL', help_text='Type of step.', max_length=200),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='step',
            name='protocol',
            field=models.ForeignKey(blank=True, help_text='Protocol for the step.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='steps', to='fms_core.protocol'),
        ),
        migrations.AlterField(
            model_name='stepspecification',
            name='column_name',
            field=models.CharField(blank=True, help_text='Name of the step template column.', max_length=200, null=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))]),
        ),
        migrations.AlterField(
            model_name='stepspecification',
            name='sheet_name',
            field=models.CharField(blank=True, help_text='Name of the step template sheet.', max_length=200, null=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))]),
        ),
        migrations.RunPython(
            create_axiom_automation_step,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            create_axiom_experiment_run_related_objects,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AddField(
            model_name='stephistory',
            name='sample',
            field=models.ForeignKey(default=0, help_text='Source sample that completed the step.', on_delete=django.db.models.deletion.PROTECT, related_name='StepHistory', to='fms_core.sample'),
            preserve_default=False,
        ),
        migrations.RunPython(
            initialize_step_history_sample,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='stephistory',
            name='process_measurement',
            field=models.ForeignKey(blank=True, help_text='Process measurement associated to the study step.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='StepHistory', to='fms_core.processmeasurement'),
        ),
        migrations.RunPython(
            create_axiom_workflow,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
