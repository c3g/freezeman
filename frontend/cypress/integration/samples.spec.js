/// <reference types="cypress" />

// Fixtures:
//  - credentials.json
//  - Sample_submission_v0.11.xlsx
//  - Sample_submission_v0.9.1_AB.xlsx
//  - Sample_update_v0.5.xlsx

// Helpers
// stored in .../cypress/support/commands.js
// cy.getCredentials
// cy.login
// cy.navigateTo
// cy.submitForm

export const samplesTests = () => {
  context('samples section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/sign-in')
      cy.getCredentials().then(cy.login)
    })

    context('Samples', () => {
      it('creates samples (template import)', () => {
        cy.navigateTo('Samples', 'Add Samples')
        cy.get('input[type=file]').attachFile('Sample_submission_v0.9.1_AB.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
        cy.get('body').should('contain', '1-8 of 8 items')
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