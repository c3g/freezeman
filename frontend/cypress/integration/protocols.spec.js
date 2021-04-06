/// <reference types="cypress" />

// Fixtures:
//  - credentials.json
//  - Extraction_v0.9.xlsx
//  - Sample_transfer_v0.1.xlsx

// Helpers
// stored in .../cypress/support/commands.js
// cy.getCredentials
// cy.login
// cy.navigateTo
// cy.submitForm

export const protocolsTests = () => {
  context('protocols section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/sign-in')
      cy.getCredentials().then(cy.login)
    })

    context('Protocols', () => {
      it('transfers samples (template import)', () => {
        cy.navigateTo('Protocols', 'Process Transfers')
        cy.get('input[type=file]').attachFile('Sample_transfer_v0.1.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
      })
  
      it('extract samples (template import)', () => {
        cy.navigateTo('Protocols', 'Process Extractions')
        cy.get('input[type=file]').attachFile('Extraction_v0.9.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
      })
      it('visits process detail page', () => {
         cy.navigateTo('Protocols')
         cy.get('.ant-table-tbody .ant-table-cell a').first().click()
         cy.get('body').should('contain', `Sample Process`)
      })
      it('visits parent sample detail page', () => {
        const sampleName = 'Sample_DNA1'
        cy.navigateTo('Protocols')
        cy.get('.ant-table-tbody .ant-table-cell').contains(sampleName).click()
        cy.get('body').should('contain', `Sample ${sampleName}`)
      })
      it('visits child sample detail page', () => {
        const sampleName = 'Sample_Blood1'
        cy.navigateTo('Protocols')
        cy.get('.ant-table-tbody .ant-table-row').eq(1).within(() => cy.get('.ant-table-cell').eq(3).contains(sampleName).click())
        cy.get('body').should('contain', `Sample ${sampleName}`)
      })
    })
  })
}