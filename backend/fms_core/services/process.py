from fms_core.models import Process

def create_processes_for_experiment_from_protocols_dict(protocols_objs_dict,
                                                        creation_comment=None):
    top_process = None
    processes_by_protocol_id = {}
    errors = []

    comment = creation_comment if creation_comment else ''
    for protocol in protocols_objs_dict.keys():
        top_process = Process.objects.create(protocol=protocol, comment="")
        for subprotocol in protocols_objs_dict[protocol]:
            sp = Process.objects.create(protocol=subprotocol,
                                        parent_process=top_process,
                                        comment=comment)
            processes_by_protocol_id[subprotocol.id] = sp

    return (top_process, processes_by_protocol_id, errors)