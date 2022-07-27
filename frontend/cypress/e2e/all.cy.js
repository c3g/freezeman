/// <reference types="cypress" />

import { containersTests } from "./containers.cy"
import { individualsTests } from "./individuals.cy"
import { samplesTests } from "./samples.cy"
import { protocolsTests } from "./protocols.cy"
import { paginationTests } from "./pagination.cy"
import { experimentsTests } from "./experiments.cy"
import { projectsTests } from "./projects.cy"
import { projectLinkSamplesTests } from "./projectLinkSamples.cy"

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
