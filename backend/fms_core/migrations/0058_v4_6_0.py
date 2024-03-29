import re
import reversion
from django.contrib.auth.models import User

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from fms_core.models._constants import SampleType, StepType

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
            "Axiom Experiment Preparation": [],
            "Axiom: Denaturation and Hybridization": [("Comment Denaturation and Hybridization", "str")],
            "Axiom: GeneTitan Reagent Preparation": [("Axiom Module 4.1 Barcode", "str"),
                                                     ("Axiom Module 4.2 Barcode", "str"),
                                                     ("Liquid Handler Instrument Reagent Preparation", "str"),
                                                     ("Comment Reagent Preparation", "str"),
                                                     ],
        }
        SUBPROTOCOLS_BY_PROTOCOL = {
            "Axiom Experiment Preparation": ["Axiom: Denaturation and Hybridization",
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
            {"name": "Experiment Run Axiom", "protocol_name": "Axiom Experiment Preparation", "expected_sample_type": SampleType.EXTRACTED_SAMPLE},
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
             "specifications": [{"name": "AutomationClass", "value": "AxiomCreateFolders"}]},
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

def create_qc_integration_spark_entities(apps, schema_editor):
    Platform = apps.get_model("fms_core", "Platform")
    InstumentType = apps.get_model("fms_core", "InstrumentType")
    Protocol = apps.get_model("fms_core", "Protocol")
    ContentType = apps.get_model('contenttypes', 'ContentType')
    PropertyType = apps.get_model("fms_core", "PropertyType")
    Step = apps.get_model("fms_core", "Step")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create Quality Control - Integration (Spark) protocol, step and property types.")
        reversion.set_user(admin_user)

        INSTRUMENT_TYPE = "Spark 10M"

        PROPERTY_TYPES_BY_PROTOCOL = {
            # Each integration will possibly require adding new optional property types 
            "Quality Control - Integration":     [("Quantity QC Flag", "str"),
                                                  ("Quantity Instrument", "str"),
                                                  ("Mass/rxn (ug)", "str"),
                                                 ],
        }

        STEPS = [
            # {name, protocol_name}
            {"name": "Quality Control - Integration (Spark)", "expected_sample_type": SampleType.EXTRACTED_SAMPLE, "type": StepType.INTEGRATION,
             # Adding a specification to be able to normalize the step selection if other steps are added to the protocol.
             "specifications": [{"name": "Instrument", "sheet_name": "Default", "column_name": "Instrument", "value": INSTRUMENT_TYPE}]},
        ]

        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        # Create the Instrument Type
        platform = Platform.objects.get(name="Quality Control")
        instrument_type = InstumentType.objects.create(platform=platform,
                                                       type=INSTRUMENT_TYPE,
                                                       created_by_id=admin_user_id,
                                                       updated_by_id=admin_user_id)
        reversion.add_to_revision(instrument_type)

        # Create protocols and properties
        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name,
                                               created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            is_optional = True
            for (property, value_type) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:

                property_type = PropertyType.objects.create(name=property,
                                                            object_id=protocol.id,
                                                            content_type=protocol_content_type,
                                                            value_type=value_type,
                                                            is_optional=is_optional,
                                                            created_by_id=admin_user_id, updated_by_id=admin_user_id)
                reversion.add_to_revision(property_type)

        # Create Step and specification
        for step_info in STEPS:
            step = Step.objects.create(name=step_info["name"],
                                       protocol=protocol,
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
            ("Axiom Genotyping", "Axiom Genotyping", ["Extraction (DNA)", "Sample QC", "Normalization (Genotyping)", "Axiom Sample Preparation", "Quality Control - Integration (Spark)", "Axiom Create Folders", "Experiment Run Axiom"]),
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

def make_flag_instrument_non_mandatory(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    ContentType = apps.get_model('contenttypes', 'ContentType')
    PropertyType = apps.get_model("fms_core", "PropertyType")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Make Library QC flag and instrument properties non mandatory.")
        reversion.set_user(admin_user)

        PROPERTY_TYPES_BY_PROTOCOL = {
            "Library Quality Control": ["Library Quantity QC Flag",
                                        "Quantity Instrument",
                                        "Library Quality QC Flag",
                                        "Quality Instrument",
                                       ],
            "Sample Quality Control": ["Sample Quantity QC Flag",
                                       "Quantity Instrument",
                                       "Sample Quality QC Flag",
                                       "Quality Instrument",
                                      ],
        }

        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        # Set property types to optional
        is_optional = True
        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.get(name=protocol_name)
            for property_type_name in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                property_type = PropertyType.objects.get(name=property_type_name,
                                                         object_id=protocol.id,
                                                         content_type=protocol_content_type)
                property_type.is_optional = is_optional
                property_type.save()
                reversion.add_to_revision(property_type)

def create_infinium_workflow(apps, schema_editor):
    Workflow = apps.get_model("fms_core", "Workflow")
    Step = apps.get_model("fms_core", "Step")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create Infinium workflow.")
        reversion.set_user(admin_user)

        WORKFLOWS = [
            # (name, step_names)
            ("Infinium Genotyping", "Infinium Genotyping", ["Extraction (DNA)", "Sample QC", "Normalization (Genotyping)", "Experiment Run Infinium"]),
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
            field=models.CharField(choices=[('PROTOCOL', 'Protocol'), ('AUTOMATION', 'Automation'), ('INTEGRATION', 'Integration')], default='PROTOCOL', help_text='Type of step.', max_length=200),
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
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('axiom 96-format array', 'axiom 96-format array'), ('infinium gs 24 beadchip', 'infinium gs 24 beadchip'), ('dnbseq-g400 flowcell', 'dnbseq-g400 flowcell'), ('dnbseq-t7 flowcell', 'dnbseq-t7 flowcell'), ('illumina-novaseq-sp flowcell', 'illumina-novaseq-sp flowcell'), ('illumina-novaseq-s1 flowcell', 'illumina-novaseq-s1 flowcell'), ('illumina-novaseq-s2 flowcell', 'illumina-novaseq-s2 flowcell'), ('illumina-novaseq-s4 flowcell', 'illumina-novaseq-s4 flowcell'), ('illumina-miseq-v2 flowcell', 'illumina-miseq-v2 flowcell'), ('illumina-miseq-v3 flowcell', 'illumina-miseq-v3 flowcell'), ('illumina-miseq-micro flowcell', 'illumina-miseq-micro flowcell'), ('illumina-miseq-nano flowcell', 'illumina-miseq-nano flowcell'), ('illumina-iseq-100 flowcell', 'illumina-iseq-100 flowcell'), ('tube', 'tube'), ('tube strip 2x1', 'tube strip 2x1'), ('tube strip 3x1', 'tube strip 3x1'), ('tube strip 4x1', 'tube strip 4x1'), ('tube strip 5x1', 'tube strip 5x1'), ('tube strip 6x1', 'tube strip 6x1'), ('tube strip 7x1', 'tube strip 7x1'), ('tube strip 8x1', 'tube strip 8x1'), ('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'), ('tube box 3x3', 'tube box 3x3'), ('tube box 6x6', 'tube box 6x6'), ('tube box 7x7', 'tube box 7x7'), ('tube box 8x8', 'tube box 8x8'), ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'), ('tube box 21x10', 'tube box 21x10'), ('tube rack 4x6', 'tube rack 4x6'), ('tube rack 8x12', 'tube rack 8x12'), ('box', 'box'), ('drawer', 'drawer'), ('freezer rack 2x4', 'freezer rack 2x4'), ('freezer rack 3x4', 'freezer rack 3x4'), ('freezer rack 4x4', 'freezer rack 4x4'), ('freezer rack 4x6', 'freezer rack 4x6'), ('freezer rack 5x4', 'freezer rack 5x4'), ('freezer rack 6x4', 'freezer rack 6x4'), ('freezer rack 7x4', 'freezer rack 7x4'), ('freezer rack 10x5', 'freezer rack 10x5'), ('freezer rack 8x6', 'freezer rack 8x6'), ('freezer rack 11x6', 'freezer rack 11x6'), ('freezer rack 16x6', 'freezer rack 16x6'), ('freezer rack 11x7', 'freezer rack 11x7'), ('freezer 3 shelves', 'freezer 3 shelves'), ('freezer 4 shelves', 'freezer 4 shelves'), ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room')], help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.', max_length=30),
        ),
        migrations.AlterField(
            model_name='experimentrun',
            name='container',
            field=models.OneToOneField(help_text='Container', limit_choices_to={'kind__in': ('axiom 96-format array', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-iseq-100 flowcell')}, on_delete=django.db.models.deletion.PROTECT, related_name='experiment_run', to='fms_core.container'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='container',
            field=models.ForeignKey(help_text='Container in which the sample is placed.', limit_choices_to={'kind__in': ('axiom 96-format array', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-iseq-100 flowcell', 'tube', 'tube strip 2x1', 'tube strip 3x1', 'tube strip 4x1', 'tube strip 5x1', 'tube strip 6x1', 'tube strip 7x1', 'tube strip 8x1', '96-well plate', '384-well plate')}, on_delete=django.db.models.deletion.PROTECT, related_name='samples', to='fms_core.container'),
        ),
        migrations.AddField(
            model_name='stephistory',
            name='sample',
            field=models.ForeignKey(blank=True, null=True, help_text='Source sample that completed the step.', on_delete=django.db.models.deletion.PROTECT, related_name='StepHistory', to='fms_core.sample'),
        ),
        migrations.RunPython(
            initialize_step_history_sample,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='stephistory',
            name='sample',
            field=models.ForeignKey(help_text='Source sample that completed the step.', on_delete=django.db.models.deletion.PROTECT, related_name='StepHistory', to='fms_core.sample'),
        ),
        migrations.AlterField(
            model_name='stephistory',
            name='process_measurement',
            field=models.ForeignKey(blank=True, help_text='Process measurement associated to the study step.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='StepHistory', to='fms_core.processmeasurement'),
        ),
        migrations.RunPython(
            create_qc_integration_spark_entities,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            create_axiom_workflow,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            make_flag_instrument_non_mandatory,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            create_infinium_workflow,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
