from django.core.management.base import BaseCommand, CommandError
from fms_core.models import Sample

INPUT_FILENAME = "/home/ulysse/Documents/ListControl.csv"
OUTPUT_FILENAME = "/home/ulysse/Documents/ListControlOut.txt"

class Command(BaseCommand):

    def handle(self, *args, **options):
        listID = []
        with open(INPUT_FILENAME, "r") as in_file:
            for line in in_file:
                sample_name = line.strip().split(",")[0]
                print(sample_name)
                samples = list(Sample.objects.filter(name=sample_name).all())
                for sample in samples:
                    listID.append('{"name":"' + str(sample.name) + '","container_id":' + str(sample.container.id) + ',"coordinates":"' + str(sample.coordinates) + '"}')
        with open(OUTPUT_FILENAME, "w") as out_file:
                for ID in listID:
                    out_file.write(str(ID) + ',\n')