# FreezeMan Web

React-based front-end for the FreezeMan system.

## Setting Up Development Environment

This web application uses `npm` for dependency management and requires NodeJS
v12+. To set up the application locally, use the following steps:

  1. Set up the back end, following instructions from 
     [the repository](https://github.com/c3g/fms).

  2. Clone the front-end repository locally and change your directory to it:
     
     ```bash
     git clone git@github.com:c3g/fms_web.git
     cd fms_web
     ```
     
  3. Install the dependencies in the project folder:
  
     ```bash
     npm install
     ```
     
  4. Start the dev server:
     
     ```bash
     npm run start
     ```

## Running the tests

For the tests to run, the server must be running with the test setup, and the
frontend dev server must be running on http://localhost:9000.

 - `npx cypress run`: Run the tests headlessly
 - `npx cypress open`: Open the testing interface, for development of tests

