/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  require('cypress-fail-fast/plugin')(on, config)
  const { exec, spawn } = require("child_process");

  const cmdError = (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    if (stdout) {
        console.log(`stdout: ${stdout}`);
    }
  }

  var backend = undefined
  var frontend = undefined

  on('task', {
    'log': console.log,
  })


  on('before:run', (details) => {
    // Create test DB
    exec("./cypress/plugins/init_db.sh", cmdError);
    // Start Backend
    backend=spawn("./cypress/plugins/start_backend.sh", {shell: true})
    // Start Frontend
    frontend=spawn("npm", ["start"])
  })

  on('after:run', (details) => {
    // Stop the frontend
    frontend.kill(9)
    // Stop the backend
    backend.kill(9)
    // Remove the fms_test DB
    exec("psql -d fms -c 'DROP DATABASE IF EXISTS fms_test;'", cmdError);
  })
}
