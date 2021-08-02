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

export const paginationTests = () => {
  context('pagination size test', () => {

    context('Pagination Size', () => {
      it('changes the containers pagination size and check if the change has been made', () => {
        cy.visit('http://localhost:9000/login')
        cy.getCredentials().then(cy.login)
        cy.navigateTo('Containers')
        cy.get('.ant-select-selection-item').click()
        cy.get('[title="10 / page"] > .ant-select-item-option-content').click()
        cy.get('.ant-select-selection-item').should('contain', '10 / page')
      })

      it('navigates to sample and check if the changes are also there', () => {
        cy.navigateTo('Samples')
        cy.get('.ant-select-selection-item').click()
        cy.get('[title="10 / page"] > .ant-select-item-option-content').click()
        cy.get('.ant-select-selection-item').should('contain', '10 / page')
      })

      it('changes the sample pagination size and check if the change has been made', () => {
        cy.visit('http://localhost:9000/login')
        cy.getCredentials().then(cy.login)
        cy.navigateTo('Containers')
        cy.get('.ant-select-selection-item').click()
        cy.get('[title="50 / page"] > .ant-select-item-option-content').click()
        cy.get('.ant-select-selection-item').should('contain', '50 / page')
      })

      it('navigates to users and check if the changes are also there', () => {
        cy.navigateTo('Samples')
        cy.get('.ant-select-selection-item').click()
        cy.get('.ant-select-selection-item').should('contain', '50 / page')
      })
    })
  })
}
