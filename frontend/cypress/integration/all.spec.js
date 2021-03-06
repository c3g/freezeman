/// <reference types="cypress" />

import { containersTests } from "./containers.spec"
import { individualsTests } from "./individuals.spec"
import { samplesTests } from "./samples.spec"
import { protocolsTests } from "./protocols.spec"

// Tests
context('All tests', () => {
  containersTests()
  individualsTests()
  samplesTests()
  protocolsTests()
})
