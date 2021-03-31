/// <reference types="cypress" />

// Fixtures:
//  - credentials.json
//  - Container_creation_v0.4.xlsx
//  - Container_move_v0.4.xlsx
//  - Container_rename_v0.1.xlsx
//  - Extraction_v0.9.xlsx
//  - Sample_submission_v0.11.xlsx
//  - Sample_submission_v0.9.1_AB.xlsx
//  - Sample_transfer_v0.1.xlsx
//  - Sample_update_v0.5.xlsx

// Helpers
const getCredentials = () =>
  cy.fixture('credentials')

const login = (credentials) => {
  cy.get('[autocomplete=username]').type(credentials.user)
  cy.get('input[type=password]').type(credentials.password)
  cy.get('form').submit()
}

const navigateTo = (section, button) => {
  cy.get('.ant-layout-sider li').contains(section).click()
  if (button)
    cy.get('button').contains(button).click()
}

const submit = () =>
  cy.get('button').contains('Submit').click()


// Tests
context('All tests', () => {

  beforeEach(() => {
    cy.visit('http://localhost:9000/sign-in')
    getCredentials().then(login)
  })

  it('logs in', () => {
    cy.url().should('contain', '/dashboard')
  })

  context('Containers', () => {
    const singleContainerBarcode = 'test-container-add';
    it('creates single container', () => {
      navigateTo('Container', 'Add')
      const comment = 'This is a comment.'
      cy.get('#name').type(singleContainerBarcode)
      cy.get('#kind').click()
      cy.get('.ant-select-dropdown .ant-select-item-option').first().click()
      cy.get('#barcode').type(singleContainerBarcode)
      cy.get('#comment').type(comment)
      submit()
      cy.get('body').should('contain', `Container ${name}`) // Details title
    })

    it('visit container detail page', () => {
       navigateTo('Containers')
       cy.get('.ant-table-cell').contains(singleContainerBarcode).click()
       cy.get('body').should('contain', `Container ${singleContainerBarcode}`)
    })

    it('creates multiple containers (template import)', () => {
      navigateTo('Container', 'Add Containers')
      cy.get('input[type=file]').attachFile('Container_creation_v0.4.xlsx')
      submit()
      cy.get('.ant-alert-success').should('contain', 'Template submitted')
      cy.get('button').contains('Go Back').click()
      // cy.get('body').should('contain', '1-10 of 15 items')
    })
  })

  context('Samples', () => {
    it('creates samples (template import)', () => {
      navigateTo('Samples', 'Add Samples')
      cy.get('input[type=file]').attachFile('Sample_submission_v0.9.1_AB.xlsx')
      submit()
      cy.get('.ant-alert-success').should('contain', 'Template submitted')
      cy.get('button').contains('Go Back').click()
      // cy.get('body').should('contain', '1-8 of 8 items')
    })

    it('visits sample detail page', () => {
      // Sample from template import
      const sampleName = 'Sample_DNA1'
      navigateTo('Samples')
      cy.get('.ant-table').contains(sampleName).click()
      cy.get('body').should('contain', `Sample ${sampleName}`)
    })
  })

  context('Protocols', () => {
    it('transfers samples (template import)', () => {
      navigateTo('Protocols', 'Process Transfers')
      cy.get('input[type=file]').attachFile('Sample_transfer_v0.1.xlsx')
      submit()
      cy.get('.ant-alert-success').should('contain', 'Template submitted')
      cy.get('button').contains('Go Back').click()
    })

    it('extract samples (template import)', () => {
      navigateTo('Protocols', 'Process Extractions')
      cy.get('input[type=file]').attachFile('Extraction_v0.9.xlsx')
      submit()
      cy.get('.ant-alert-success').should('contain', 'Template submitted')
      cy.get('button').contains('Go Back').click()
    })

    it('visits process detail page', () => {
       navigateTo('Protocols')
       cy.get('.anticon-eye').first().parent('a').click()
       cy.get('body').should('contain', `Process`)
    })
  })

})
