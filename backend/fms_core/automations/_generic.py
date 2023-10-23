import abc

class GenericAutomation(metaclass=abc.ABCMeta):
    work_folder = None

    def __init__(self):
        pass

    @abc.abstractmethod
    def execute(self, **kwargs):
        raise f"Automation called without being defined." # Overload