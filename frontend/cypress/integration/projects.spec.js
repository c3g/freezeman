/// <reference types="cypress" />

// Fixtures:
//  - credentials.json
//  - Sample_submission_v3_2_0_F_A_1.xlsx
//  - Sample_update_v3_2_0_F_A_1.xlsx

// Helpers
// stored in .../cypress/support/commands.js
// cy.getCredentials
// cy.login
// cy.navigateTo
// cy.submitForm

import { WAIT_TIME } from '../constants';

export const projectsTests = () => {
  context('projects section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/login')
      cy.getCredentials().then(cy.login)
    })

    context('Projects', () => {
      const projectName = "TestProject"
      const principalInvestigator = "David Bujold"
      const requestorName = "Sebastian Ballesteros"
      const requestorEmail = "sebastiansemail@mcgill.ca"
      it('creates a project via the GUI', () => {
        cy.navigateTo('Projects', 'Add')
        cy.get('#name').type(projectName)
        cy.get('#principal_investigator').type(principalInvestigator)
        cy.get('#requestor_name').type(requestorName)
        cy.get('#requestor_email').type(requestorEmail)
        cy.get('#comment').type("This is a test comment.")
        cy.get('.ant-btn').click()
      })

      it('visits a particular project detailed page to ensure it is there', () => {
        cy.navigateTo('Projects')
        cy.wait(WAIT_TIME)
        cy.get('td.ant-table-cell').contains(projectName)
          .parent().parent().should('have.class', 'ant-table-row')
          .within(() => {
            cy.get('td').contains(projectName).click()
        });
        cy.get('body').should('contain', projectName)
        cy.get('body').should('contain', principalInvestigator)
        cy.get('body').should('contain', requestorName)
        cy.get('body').should('contain', requestorEmail)

      });
    })
  })
}
