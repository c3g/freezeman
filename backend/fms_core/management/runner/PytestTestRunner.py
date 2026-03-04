class PytestTestRunner():
    """Runs pytest to discover and run tests."""

    def __init__(self, verbosity=1, failfast=False, keepdb=False, pdb=False, **kwargs):
        self.verbosity = verbosity
        self.failfast = failfast
        self.keepdb = keepdb
        self.pdb = pdb

    @classmethod
    def add_arguments(cls, parser):
        parser.add_argument(
            '--keepdb', action='store_true',
            help='Preserves the test DB between runs.'
        )
        parser.add_argument(
            '--pdb', action='store_true',
            help='Drop into pdb on errors or failures.'
        )

    def run_tests(self, test_labels):
        """Run pytest and return the exitcode.

        It translates some of Django's test command option to pytest's.
        """
        import pytest

        argv = ['--maxprocesses=9', '-n=logical']
        if self.verbosity == 0:
            argv.append('--quiet')
            argv.append('--show-capture=no')
        if self.verbosity == 2:
            argv.append('--verbose')
            argv.append('--show-capture=no')
        if self.verbosity == 3:
            argv.append('-vv')
        if self.failfast:
            argv.append('--exitfirst')
        if self.keepdb:
            argv.append('--reuse-db')
        if self.pdb:
            argv.append('--pdb')

        argv.extend(test_labels)
        return pytest.main(argv)
