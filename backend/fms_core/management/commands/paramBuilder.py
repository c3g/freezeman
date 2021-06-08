from django.core.management.base import BaseCommand, CommandError
from fms_core.models import Sample, Container

INPUT_FILENAME = "/home/ulysse/Documents/SampleRenamingSource.csv"
OUTPUT_FILENAME = "/home/ulysse/Documents/SampleRenamingOut.txt"

class Command(BaseCommand):

    def handle(self, *args, **options):
        listID = []
        with open(INPUT_FILENAME, "r") as in_file:
            samplesInfo = {}
            for line in in_file:
                entry = line.strip().split("\t")
                container_barcode = entry[0]
                old_sample_name = entry[2]
                new_sample_name = entry[3]
                old_alias = entry[4]
                new_alias = entry[5]

                sample = Sample.objects.filter(container__barcode=container_barcode).get()
                samplesInfo[sample.id] = {"old_name": old_sample_name, "new_name": new_sample_name, "old_alias": old_alias, "new_alias": new_alias}
        with open(OUTPUT_FILENAME, "w") as out_file:
            index = 1
            for key in samplesInfo:

                out_file.write('{\n')
                out_file.write('\t"curation_index":' + str(index) + ',\n')
                out_file.write('\t"action":"update_field_value",\n')
                out_file.write('\t"comment":"Ariane Boisclair requested that sample be given a new name. Helpspot 25355.",\n')
                out_file.write('\t"entity_model":"Sample",\n')
                out_file.write('\t"entity_identifier":[\n')
                out_file.write('\t\t{"id":' + str(key) + '}\n')
                out_file.write('\t],\n')
                out_file.write('\t"field_name":"name",\n')
                out_file.write('\t"value_old":"' + str(samplesInfo[key]["old_name"]) + '",\n')
                out_file.write('\t"value_new":"' + str(samplesInfo[key]["new_name"]) + '",\n')
                out_file.write('\t"requester_user_id":6\n')
                out_file.write('},\n')

                index += 1

            for key in samplesInfo:

                out_file.write('{\n')
                out_file.write('\t"curation_index":' + str(index) + ',\n')
                out_file.write('\t"action":"update_field_value",\n')
                out_file.write('\t"comment":"Ariane Boisclair requested that sample be given a new alias. Helpspot 25355.",\n')
                out_file.write('\t"entity_model":"Sample",\n')
                out_file.write('\t"entity_identifier":[\n')
                out_file.write('\t\t{"id":' + str(key) + '}\n')
                out_file.write('\t],\n')
                out_file.write('\t"field_name":"alias",\n')
                out_file.write('\t"value_old":"' + str(samplesInfo[key]["old_alias"]) + '",\n')
                out_file.write('\t"value_new":"' + str(samplesInfo[key]["new_alias"]) + '",\n')
                out_file.write('\t"requester_user_id":6\n')
                out_file.write('},\n')

                index += 1