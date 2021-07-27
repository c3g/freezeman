/// <reference types="cypress" />

// Fixtures:
//  - credentials.json
//  - Experiment_submission_v3_3_0_F_A_1.xlsx
//  - Experiment_update_v3_3_0_F_A_1.xlsx

// Helpers
// stored in .../cypress/support/commands.js
// cy.getCredentials
// cy.login
// cy.navigateTo
// cy.submitForm

export const experimentsTests = () => {
  context('experiment section tests', () => {

    beforeEach(() => {
      cy.visit('http://localhost:9000/login')
      cy.getCredentials().then(cy.login)
    })

    context('Experiments', () => {
      const experimentBarcode1 = 'test_abc1';
      const experimentBarcode2 = 'test_qwe2';
      const experimentType = 'Infinium Global Screening Array-24 (iScan_1)';

      it('creates experiments (template import)', () => {
        cy.navigateTo('Experiments')
        cy.wait(5000)
        cy.get('button').contains('Add Experiments').click()
        cy.get('input[type=file]').attachFile('Experiment_submission_v3_3_0_F_A_1.xlsx')
        cy.wait(5000)
        cy.submitForm()
        cy.wait(5000)
        cy.get('.ant-alert-success').should('contain', 'Template submitted')
        cy.get('button').contains('Go Back').click()
        cy.get('body').should('contain', experimentBarcode1)
        cy.get('body').should('contain', experimentBarcode2)
      });

      it('visits experiment detail page and checks the existence of the first experiment and validates it', () => {
        cy.navigateTo('Experiments')
        cy.wait(5000)
        cy.get('td.ant-table-cell').contains(experimentBarcode1)
          .parent().parent().should('have.class', 'ant-table-row')
          .within(() => {
            cy.get('td').contains('Experiment').click()
        });
        cy.get('body').should('contain', experimentBarcode1)
        cy.get('.ant-tabs-nav-list > :nth-child(3)').click()
        cy.get('body').should('contain', 'Sample_DNA1 sample (DNA) @ A01')
        cy.get('body').should('contain', 'Sample_RNA1 sample (RNA) @ A02')
        cy.get('body').should('contain', 'Sample_DNA1 sample (DNA) @ B02')
      });

      it('visits experiment detail page and checks the existence of the second experiment and validates it', () => {
        cy.navigateTo('Experiments')
        cy.wait(5000)
        cy.get('td.ant-table-cell').contains(experimentBarcode2)
          .parent().parent().should('have.class', 'ant-table-row')
          .within(() => {
            cy.get('td').contains('Experiment').click()
        });
        cy.get('body').should('contain', experimentBarcode2)
        cy.get('.ant-tabs-nav-list > :nth-child(3)').click()
        cy.get('body').should('contain', 'Sample_Blood1 sample (BLOOD) @ A01')
        cy.get('body').should('contain', 'Sample_Expectoration1 sample (EXPECTORATION) @ A02')
        cy.get('body').should('contain', 'Sample_gargle1 sample (GARGLE) @ A03')
        cy.get('body').should('contain', 'Sample_plasma1 sample (PLASMA) @ A04')
        cy.get('body').should('contain', 'Sample_saliva1 sample (SALIVA) @ A05')
        cy.get('body').should('contain', 'Sample_swab1 sample (SWAB) @ A06')
        cy.get('body').should('contain', 'Sample_Blood1 sample (BLOOD) @ B03')
      });

      it('visits a particular sample detailed page to ensure the first experiment is there', () => {
        cy.navigateTo('Samples')
        cy.wait(5000)
        cy.get('[data-row-key="27"] > :nth-child(2) > a > div').click()
        cy.get('#rc-tabs-0-tab-3').click()
        cy.get('body').should('contain', experimentType)
      });

      it('visits a particular sample detailed page to ensure the second experiment is there', () => {
        cy.navigateTo('Samples')
        cy.wait(5000)
        cy.get('[data-row-key="28"] > :nth-child(2) > a > div').click()
        cy.get('#rc-tabs-0-tab-3').click()
        cy.get('body').should('contain', experimentType)
      });
    });
  })
}
