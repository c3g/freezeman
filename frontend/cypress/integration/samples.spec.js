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

import {singleContainerName, singleIndividualName, singleSampleName} from "../tests_constants";

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

      it('creates single sample', () => {
        cy.navigateTo('Samples', 'Add')
        cy.get('#name').type(singleSampleName)
        cy.get('#sample_kind').click()
        cy.get('.ant-select-dropdown .ant-select-item-option').last().click()
        cy.get('input#individual').type(singleIndividualName)
        cy.get('input#container').type(singleContainerName)
        cy.get('#coordinates').type('B12')
        cy.get('#volume').type('100')
        cy.get('#creation_date').click()
        cy.get('.ant-picker .ant-picker-input').click()
        cy.get('.ant-picker-body .ant-picker-cell').first().click()
        cy.get('#comment').type('This is a test')
        cy.get('#collection_site').type('Site Test')
        cy.submitForm()
        cy.get('body').should('contain', `Sample ${singleSampleName}`) // Details title
      })
    })
  })
}