__all__ = [

]

#TODO: add warnings to all the services functions. (possibly create a dataclass that would return the tuples)

'''
    Services functions should return 
        a tuple (object, list_of_objects [optional], list_of_errors, list_of_warnings [optional]) 
    
    These functions should be callable by any part of the app (viewsets, importers, etc.), 
    be single-responsability as much as possible, and should not have unintended side-effects
    (other than the creation, getting, updating, deleting) records.
'''