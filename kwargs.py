from decimal import Decimal

def foo(**kwargs):

    if 'hello' in kwargs:
        print(kwargs['hello'])
    
    if 'goodbye' in kwargs:
        print(kwargs['goodbye'])

    if 'number' in kwargs:
        num = kwargs['number']
        if isinstance(num, Decimal):
            print('yup, decimal')
        else:
            print('nope, not decimal')

    if 'something' in kwargs:
        print(kwargs['something'])


kws = {
    'hello': 'hi',
    'goodbye': 'ciao',
    'number': Decimal(1.0)
}

foo(**kws)