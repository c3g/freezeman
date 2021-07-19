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

export const errorMessagesTests = () => {
  context('Correct error messages tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/login')
      cy.getCredentials().then(cy.login)
    })

    context('Samples', () => {
      it('creates samples (template import) with expected error messages: container errors and sample name', () => {
        cy.navigateTo('Samples', 'Add Samples')
        cy.get('input[type=file]').attachFile('Sample_submission_with_errors_v3_2_0_F_A_1.xlsx')
        cy.get('.ant-alert').should('contain', 'Row 1: container_barcode - Container could not be processed because the container kind is invalid.')
        cy.get('.ant-alert').should('contain', 'Row 1: container_kind - This field cannot be blank.')
        cy.get('.ant-alert').should('contain', 'Row 1: container - Container could not be processed due to missing or invalid information.')
        cy.get('.ant-alert').should('contain', 'Row 2: container_barcode - [\'This field cannot be blank.\']')
        cy.get('.ant-alert').should('contain', 'Row 2: container_name - This field cannot be blank.')
        cy.get('.ant-alert').should('contain', 'Row 2: container - Container could not be processed due to missing or invalid information.')
        cy.get('.ant-alert').should('contain', 'Row 2: name - Sample name cannot be blank.')
      })

      it('creates samples (template import) with expected error messages: individual errors and concentration/volume ', () => {
        cy.navigateTo('Samples', 'Add Samples')
        cy.get('input[type=file]').attachFile('Sample_submission_with_errors_v3_2_0_F_A_2.xlsx')
        cy.get('.ant-alert').should('contain', 'Row 0: volume - This field cannot be null.')
        cy.get('.ant-alert').should('contain', 'Row 1: individual - Individual with this Name already exists.')
        cy.get('.ant-alert').should('contain', 'Row 2: individual - This field cannot be blank.')
        cy.get('.ant-alert').should('contain', 'Row 2: taxon - This field cannot be blank.')
        cy.get('.ant-alert').should('contain', 'Row 2: concentration - Concentration must be specified if the sample_kind is DNA')
      })
    })
  })
}
