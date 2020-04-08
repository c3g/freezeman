from import_export.widgets import ForeignKeyWidget


class CreateIndividualForeignKeyWidget(ForeignKeyWidget):

    def __init__(self, model, field='pk', *args, **kwargs):
        self.model = model
        self.field = field
        super(CreateIndividualForeignKeyWidget, self).__init__(model, *args, **kwargs)

    def clean(self, value, row=None, *args, **kwargs):
        obj, _ = self.model.objects.get_or_create(participant_id=value)
        return obj
