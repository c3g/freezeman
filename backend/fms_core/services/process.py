from django.core.exceptions import ValidationError
from fms_core.models import Process, Protocol

def create_process(protocol, create_child: bool=True, creation_comment=None, preloaded_structure=None):
    process_structure = {}
    errors = []
    warnings = []

    if not protocol:
        errors.append(f"Protocol needed to create a process.")
    else:
        try:
            parent_process = Process.objects.create(protocol=protocol, comment=creation_comment or "")
        except ValidationError as e:
            errors.append(';'.join(e.messages))
        process_structure[parent_process] = []

        if create_child:
            if preloaded_structure:
                children = preloaded_structure[protocol]
            else:
                children = protocol.parent_of.all()
            
            for child_protocol in children:
                try:
                    child_process = Process.objects.create(protocol=child_protocol,
                                                            parent_process = parent_process,
                                                            comment=creation_comment or "")
                except ValidationError as e:
                        errors.append(';'.join(e.messages))
                process_structure[parent_process].append(child_process)

    return (process_structure, errors, warnings)