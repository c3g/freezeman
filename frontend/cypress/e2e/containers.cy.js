/// <reference types="cypress" />

// Fixtures:
//  - credentials.json
//  - Container_creation_v3_4_0_F_A_1.xlsx
//  - Container_move_v3_2_0_F_A_1.xlsx
//  - Container_rename_v3_2_0_F_A_1.xlsx

// Helpers
// stored in .../cypress/support/commands.js
// cy.getCredentials
// cy.login
// cy.navigateTo
// cy.submitForm

import { WAIT_TIME } from '../constants';

export const containersTests = () => {
  context('containers section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/login')
      cy.getCredentials().then(cy.login)
    })

    context('Containers', () => {
      const singleContainerBarcode = 'test-container-add';
      it('creates single container', () => {
        cy.navigateTo('Containers', 'Add')
        const comment = 'This is a comment.'
        cy.get('#name').type(singleContainerBarcode)
        cy.get('#kind').click()
        cy.get('.ant-select-dropdown .ant-select-item-option').first().click()
        cy.get('#barcode').type(singleContainerBarcode)
        cy.get('#comment').type(comment)
        cy.submitForm()
        cy.get('body').should('contain', `Container ${singleContainerBarcode}`) // Details title
      })

      it('visit container detail page', () => {
         cy.navigateTo('Containers')
         cy.wait(WAIT_TIME)
         cy.get('.ant-table-cell').contains(singleContainerBarcode).click()
         cy.get('body').should('contain', `Container ${singleContainerBarcode}`)
      })

      it('creates multiple containers (template import)', () => {
        cy.navigateTo('Container', 'Add Containers')
        cy.get('input[type=file]').attachFile('Container_creation_v3_4_0_F_A_1.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
        cy.get('body').should('contain', '1-16 of 16 items')
      })

      it('moves containers (template import)', () => {
        const moveBarcodeDst = 'freezer-three';
        cy.navigateTo('Container', 'Move Containers')
        cy.get('input[type=file]').attachFile('Container_move_v3_2_0_F_A_1.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
        cy.get('body').should('contain', '1-16 of 16 items')
        cy.get('.ant-table-cell').contains('Barcode').parents('.ant-table-filter-column').within(() => cy.get('.ant-dropdown-trigger').click().type(moveBarcodeDst)) // filter by barcode (column 1)
        cy.get('.ant-table-cell').contains(moveBarcodeDst).parents('.ant-table-row').should('contain', '0')
        cy.contains('th', 'Children').invoke('index').then((column) => {
          cy.contains('.ant-table-cell', moveBarcodeDst).parents('.ant-table-row').within(() => {
            cy.get('.ant-table-cell').eq(column).should('contain', '2')
          })
        })
        cy.get('button').contains('Clear Filters').click()
      })

      it('renames containers (template import)', () => {
        const renameBarcodeSrc = 'freezer-three';
        const renameBarcodeDst = 'freezer-four';
        const renameNameDst = 'freezer-4';
        cy.navigateTo('Container', 'Rename Containers')
        cy.get('input[type=file]').attachFile('Container_rename_v3_2_0_F_A_1.xlsx')
        cy.submitForm()
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
        cy.get('body').should('contain', '1-16 of 16 items')
        cy.get('.ant-table-cell').contains('Barcode').parents('.ant-table-filter-column').within(() => cy.get('.ant-dropdown-trigger').click().type(renameBarcodeSrc)) // filter by barcode (column 1)
        cy.get('body').should('contain', '0-0 of 0 items')
        cy.get('button').contains('Clear Filters').click()
        cy.get('.ant-table-cell').contains('Barcode').parents('.ant-table-filter-column').within(() => cy.get('.ant-dropdown-trigger').click().type(renameBarcodeDst)) // filter by barcode (column 1)
        cy.get('body').should('contain', '1-1 of 1 items')
        cy.get('button').contains('Clear Filters').click()
        cy.get('.ant-table-cell').contains('Name').parents('.ant-table-filter-column').within(() => cy.get('.ant-dropdown-trigger').click().type(renameNameDst)) // filter by barcode (column 1)
        cy.get('body').should('contain', '1-1 of 1 items')
        cy.get('button').contains('Clear Filters').click()
      })

    })
  })
}
