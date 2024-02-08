# FreezeMan Web

React-based front-end for the FreezeMan system.

## Installation

Install the dependencies in the project folder:

```bash
npm install
```

## Config

Some env variables need to be set in order to configure the frontend behaviour.
This can be done by creating .env file in the frontend directory.
An example .env was included in the repo (example.env) in order to guide de creation of the file.

Here are the variables to define :
 - FMS_ENV

## Commands

Here are the different commands for running the frontend:
 - `npm start`: Run the development server.
 - `npm run build`: Build the project for production.

## Running the tests

For the tests to run, the server must be running with the test setup, and the
frontend dev server must be running on http://localhost:9000.

 - `npx cypress run`: Run the tests headlessly
 - `npx cypress open`: Open the testing interface, for development of tests
