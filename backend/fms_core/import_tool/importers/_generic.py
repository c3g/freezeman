from pandas import pandas as pd


class GenericImporter():
    base_errors = []

    def __init__(self, file, format):
        self.file = file
        self.format = format

        self.sheets = {}
        for name in self.sheet_names:
            try:
                self.sheets[name] = pd.read_excel(self.file, sheet_name=name)
            except Exception as e:
                self.base_errors.append(e)


    ''' 
        Custom import for each template
    '''


    def import_template(self):
        return


