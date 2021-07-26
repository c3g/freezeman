/// <reference types="cypress" />

// Fixtures:
//  - credentials.json
//  - Experiment_submission_v3_3_0_F_A_1.xlsx
//  - Experiment_update_v3_3_0_F_A_1.xlsx

// Helpers
// stored in .../cypress/support/commands.js
// cy.getCredentials
// cy.login
// cy.navigateTo
// cy.submitForm

export const experimentsTests = () => {
  context('experiment section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/login')
      cy.getCredentials().then(cy.login)
    })

    context('Experiments', () => {
      it('creates experiments (template import)', () => {
        cy.navigateTo('Experiments')
        cy.wait(1000)
        cy.get('button').contains('Add Experiments').click()
        cy.get('input[type=file]').attachFile('Experiment_submission_v3_3_0_F_A_1.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
        cy.get('body').should('contain', '1-1 of 1 items')
      })

      it('visits experiment detail page', () => {
        // Sample from template import
        const experimentBarcode = 'CONTAINERFOREXPMULTIPLE'
        cy.navigateTo('Experiments')
        cy.wait(2000)
        cy.get('td').within(($tr) => {
          cy.contains('Experiment')
          .click()
        })
        cy.get('body').should('contain', experimentBarcode)
      })
    })
  })
}
