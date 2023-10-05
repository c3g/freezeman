import abc
from collections import defaultdict

class GenericAutomation(metaclass=abc.ABCMeta):

    def __init__(self):
        self.errors = defaultdict(list)
        self.warnings = defaultdict(list)

    @abc.abstractmethod
    def execute(self, **kwargs):
        pass # Overload