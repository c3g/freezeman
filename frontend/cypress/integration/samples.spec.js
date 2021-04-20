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
      const singleSampleName = 'test-sample-add';
      it('creates single sample', () => {
        cy.navigateTo('Samples', 'Add')
        cy.get('#name').type(singleSampleName)
        cy.get('#sample_kind').click()
        cy.get('.ant-select-dropdown .ant-select-item-option').last().click()
        // cy.get('#individual').click()
        // cy.get('.ant-select-selection-search .ant-select-selection-search-input').type('test-individual-name')
        // cy.get('#container').click()
        // cy.get('.ant-select-selection-search .ant-select-selection-search-input').type('test-container-add')
        cy.get('#coordinates').type('B12')
        cy.get('#volume').type('100')
        cy.get('#collection_site').type('Site Test')
        cy.get('#creation_date').click()
        cy.get('.ant-picker .ant-picker-input').click()
        cy.get('.ant-picker-body .ant-picker-cell').first().click()
        cy.get('#comment').type('This is a test')
        cy.submitForm()
        cy.get('body').should('contain', `Container ${name}`) // Details title
      })

      it('visit sample detail page', () => {
        cy.navigateTo('Samples')
        cy.get('.ant-table-cell').contains(singleSampleName).click()
        cy.get('body').should('contain', `Sample ${singleSampleName}`)
      })
    })
  })
}