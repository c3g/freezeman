/// <reference types="cypress" />

// Fixtures:
//  - credentials.json
//  - Container_creation_v0.4.xlsx
//  - Container_move_v0.4.xlsx
//  - Container_rename_v0.1.xlsx

// Helpers
// stored in .../cypress/support/commands.js
// cy.getCredentials
// cy.login
// cy.navigateTo
// cy.submitForm

export const containersTests = () => {
  context('contrainers section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/sign-in')
      cy.getCredentials().then(cy.login)
    })

    context('Containers', () => {
      const singleContainerBarcode = 'test-container-add';
      it('creates single container', () => {
        cy.navigateTo('Container', 'Add')
        const comment = 'This is a comment.'
        cy.get('#name').type(singleContainerBarcode)
        cy.get('#kind').click()
        cy.get('.ant-select-dropdown .ant-select-item-option').first().click()
        cy.get('#barcode').type(singleContainerBarcode)
        cy.get('#comment').type(comment)
        cy.submitForm()
        cy.get('body').should('contain', `Container ${name}`) // Details title
      })
  
      it('visit container detail page', () => {
         cy.navigateTo('Containers')
         cy.get('.ant-table-cell').contains(singleContainerBarcode).click()
         cy.get('body').should('contain', `Container ${singleContainerBarcode}`)
      })
  
      it('creates multiple containers (template import)', () => {
        cy.navigateTo('Container', 'Add Containers')
        cy.get('input[type=file]').attachFile('Container_creation_v0.4.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
        cy.get('body').should('contain', '1-10 of 15 items')
      })
    })
  })
}