/// <reference types="cypress" />

import { containersTests } from "./containers.spec"
import { individualsTests } from "./individuals.spec"
import { samplesTests } from "./samples.spec"
import { protocolsTests } from "./protocols.spec"
import { paginationTests } from "./pagination.spec"
import { experimentsTests } from "./experiments.spec"
import { projectsTests } from "./projects.spec"
import { projectLinkSamplesTests } from "./projectLinkSamples.spec"

// Tests
context('All tests', () => {
  containersTests()
  individualsTests()
  samplesTests()
  protocolsTests()
  paginationTests()
  experimentsTests()
  projectsTests()
  projectLinkSamplesTests()
})
