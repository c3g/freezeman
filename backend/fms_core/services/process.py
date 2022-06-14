from django.core.exceptions import ValidationError
from fms_core.models import Process, Protocol

def create_process(protocol, creation_comment=None, create_children: bool=False, children_protocols=None, imported_template=None):
    process_by_protocol_id = {}
    errors = []
    warnings = []

    if not protocol:
        errors.append(f"Protocol needed to create a process.")
    else:
        try:
            parent_process = Process.objects.create(protocol=protocol, comment=creation_comment or "", imported_template=imported_template)
        except ValidationError as e:
            errors.append(';'.join(e.messages))
        process_by_protocol_id[protocol.id] = parent_process

        if create_children:
            children = children_protocols or protocol.parent_of.all()
            for child_protocol in children:
                try:
                    child_process = Process.objects.create(protocol=child_protocol,
                                                           parent_process=parent_process,
                                                           comment=creation_comment or "",
                                                           imported_template=imported_template)
                except ValidationError as e:
                        errors.append(';'.join(e.messages))
                process_by_protocol_id[child_protocol.id] = child_process

    return (process_by_protocol_id, errors, warnings)