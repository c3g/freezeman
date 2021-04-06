// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import 'cypress-file-upload';

Cypress.Commands.add("getCredentials", () => cy.fixture('credentials'))

Cypress.Commands.add("login", (credentials) => {
  cy.get('[autocomplete=username]').type(credentials.user)
  cy.get('input[type=password]').type(credentials.password)
  cy.get('form').submit()

  it('logs in', () => {
    cy.url().should('contain', '/dashboard')
  })
})

Cypress.Commands.add("navigateTo", (section, button) => {
  cy.get('.ant-layout-sider li').contains(section).click()
  if (button)
    cy.get('button').contains(button).click()
})

Cypress.Commands.add("submitForm", () => cy.get('button').contains('Submit').click())
