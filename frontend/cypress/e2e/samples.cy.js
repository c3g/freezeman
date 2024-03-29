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

export const samplesTests = () => {
  context('samples section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/login')
      cy.getCredentials().then(cy.login)
    })

    context('Samples', () => {
      it('creates samples (template import)', () => {
        cy.navigateTo('Samples', 'Add Samples')
        cy.get('input[type=file]').attachFile('Sample_submission_v3_2_0_F_A_1.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
        cy.get('body').should('contain', '1-8 of 8 items')
      })

      it('updates samples (template import)', () => {
        cy.navigateTo('Samples', 'Update Samples')
        cy.get('input[type=file]').attachFile('Sample_update_v3_2_0_F_A_1.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
        cy.navigateTo('Protocols')
        cy.wait(WAIT_TIME)
        cy.get('.ant-table-cell').contains('Protocol').parents('.ant-table-filter-column').within(() => cy.get('.ant-dropdown-trigger').click().type('update{enter}')) // filter by protocol
        cy.get('body').should('contain', '1-2 of 2 items')
      })

      it('visits sample detail page', () => {
        // Sample from template import
        const sampleName = 'Sample_DNA1'
        cy.navigateTo('Samples')
        cy.get('.ant-table').contains(sampleName).click()
        cy.get('body').should('contain', `Sample ${sampleName}`)
      })
    })
  })
}
