# Running and Debugging Backend Tests

## VSCode

To run the freezeman backend tests simply execute this npm command in the project directory:

`npm run proc:backend_test`

This will build a test database and then run all tests. After the tests are run, the
database is destroyed.

To debug tests, we need to build the test database and then launch the test runner from
the debugger, using a launch configuration. 

First build the database, by running:

`npm run proc:backend_setup_test_db`

Next, setup a launch configuration to launch the debugger and run the test. 

*Launch Configuration*

```
 {
    "name": "Debug Tests",
    "type": "python",
    "request": "launch",
    "cwd": "${workspaceFolder}/backend",
    "program": "${workspaceFolder}/backend/manage.py",
    "args": [
        "test",
        "--keepdb"
    ],
    "django": true,
    "justMyCode": true,
},
```

This will run the tests without destroying the database afterward (`--keepdb`), so that we can debug the tests multiple times without having to wait for the db to be built.

# PyCharm

*Please document how to setup a PyCharm debug configuration...*