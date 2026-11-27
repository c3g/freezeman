# FreezeMan Web

React-based front-end for the FreezeMan system.

## Running in containers

You can run the frontend in a container stack. See [../oci/DEVELOPMENT.md](../oci/DEVELOPMENT.md).

The sections below describe the setup without containers.

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
