/// <reference types="cypress" />

// Fixtures:
//  - credentials.json
//  - Sample_extraction_v3_3_0_F_A_1.xlsx
//  - Sample_transfer_v3_2_0_F_A_1.xlsx

// Helpers
// stored in .../cypress/support/commands.js
// cy.getCredentials
// cy.login
// cy.navigateTo
// cy.submitForm

import { WAIT_TIME } from '../constants';

export const protocolsTests = () => {
  context('protocols section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/login')
      cy.getCredentials().then(cy.login)
    })

    context('Protocols', () => {
      it('transfers samples (template import)', () => {
        cy.navigateTo('Protocols', 'Process Transfers')
        cy.get('input[type=file]').attachFile('Sample_transfer_v3_2_0_F_A_1.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
      })

      it('extract samples (template import)', () => {
        cy.navigateTo('Protocols', 'Process Extractions')
        cy.get('input[type=file]').attachFile('Sample_extraction_v3_3_0_F_A_1.xlsx')
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
        cy.wait(WAIT_TIME)
        cy.get('.ant-table-tbody .ant-table-cell').contains(sampleName).click()
        cy.get('body').should('contain', `Sample ${sampleName}`)
      })
      it('visits child sample detail page', () => {
        const sampleName = 'Sample_Blood1'
        cy.navigateTo('Protocols')
        cy.contains('th', 'Source Sample').invoke('index').then((i) => {
          cy.get('.ant-table-tbody .ant-table-row').eq(4).within(() => cy.get('.ant-table-cell').eq(i).contains(sampleName).click())
        })
        cy.get('body').should('contain', `Sample ${sampleName}`)
      })
    })
  })
}
