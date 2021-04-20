/// <reference types="cypress" />

// Fixtures:
//  - credentials.json

// Helpers
// stored in .../cypress/support/commands.js
// cy.getCredentials
// cy.login
// cy.navigateTo
// cy.submitForm

export const individualsTests = () => {
  context('individuals section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/sign-in')
      cy.getCredentials().then(cy.login)
    })

    context('Individuals', () => {
      const singleIndividualName = 'test-individual-name'
      it('creates single individual', () => {
        cy.navigateTo('Individuals', 'Add')
        cy.get('#name').type(singleIndividualName)
        cy.get('#taxon').click()
        cy.get('.ant-radio-group .ant-radio-button-wrapper').first().click()
        cy.get('#sex').click()
        cy.get('.ant-radio-group .ant-radio-button-wrapper').first().click()
        cy.submitForm()
        cy.get('body').should('contain', `${singleIndividualName}`) // Details title
      })

      it('visit individuals detail page', () => {
         cy.navigateTo('Individuals')
         cy.get('.ant-table-cell').contains(singleIndividualName).click()
         cy.get('body').should('contain', `${singleIndividualName}`)
      })
    })
  })
}