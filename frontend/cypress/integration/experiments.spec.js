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
      const experimentBarcode1 = 'CONTAINERFOREXPMULTIPLE7';
      const experimentBarcode2 = 'CONTAINERFOREXPMULTIPLE8';

      it('creates experiments (template import)', () => {
        cy.navigateTo('Experiments')
        cy.wait(5000)
        cy.get('button').contains('Add Experiments').click()
        cy.get('input[type=file]').attachFile('Experiment_submission_v3_3_0_F_A_1.xlsx')
        cy.wait(5000)
        cy.submitForm()
        cy.wait(5000)
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
        cy.get('body').should('contain', experimentBarcode1)
        cy.get('body').should('contain', experimentBarcode2)
      });

      it('visits experiment detail page and checks the existence of the first experiment', () => {
        cy.navigateTo('Experiments')
        cy.wait(5000)
        cy.get('td.ant-table-cell').contains(experimentBarcode1)
          .parent().parent().should('have.class', 'ant-table-row')
          .within(() => {
            cy.get('td').contains('Experiment').click()
        });
        cy.get('body').should('contain', experimentBarcode1)
      });

      it('visits experiment detail page and checks the existence of the second experiment', () => {
        cy.navigateTo('Experiments')
        cy.wait(5000)
        cy.get('td.ant-table-cell').contains(experimentBarcode2)
          .parent().parent().should('have.class', 'ant-table-row')
          .within(() => {
            cy.get('td').contains('Experiment').click()
        });
        cy.get('body').should('contain', experimentBarcode2)
      });
    });
  })
}
