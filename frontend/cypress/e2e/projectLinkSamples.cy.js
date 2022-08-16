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

export const projectLinkSamplesTests = () => {
  context('link projects to samples section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/login')
      cy.getCredentials().then(cy.login)
    })

    context('Link Projects to Samples', () => {
      const projectName = "TestProject"
      it('links project to samples (template import)', () => {
        cy.navigateTo('Projects', 'Link Samples')
        cy.get('input[type=file]').attachFile('Project_link_Samples_v3_4_0_F_A_1.xlsx')
        cy.wait(WAIT_TIME)
        cy.submitForm()
        cy.wait(WAIT_TIME)
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
      })
      it('visits a particular project detailed page to ensure it is there', () => {
        const sampleName1 = "Sample_DNA1"
        const sampleName2 = "Sample_RNA1"
        cy.navigateTo('Projects')
        cy.wait(WAIT_TIME)
        cy.get('td.ant-table-cell').contains(projectName)
          .parent().parent().should('have.class', 'ant-table-row')
          .within(() => {
            cy.get('td').contains(projectName).click()
        });
        cy.get('body').should('contain', sampleName1)
        cy.get('body').should('contain', sampleName2)
      });
    })
  })
}
