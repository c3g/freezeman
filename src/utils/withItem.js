import Container from "../modules/containers/actions.js"
import Sample from "../modules/samples/actions.js"
import Individual from "../modules/individuals/actions.js"

let store = undefined

/** Initialized in src/index.js */
export const setStore = value => { store = value }

/**
 * 
 * @param {string} id 
 * @param {Function} fn 
 * @param {any} [defaultValue = null] 
 */
export const withContainer = (containersByID, id, fn, defaultValue = null) => {
  if (!id)
    return defaultValue

  const container = containersByID[id]

  if (!container) {
    store.dispatch(Container.get(id))      
    return defaultValue
  }

  if (container.isFetching)
    return defaultValue

  return fn(container)
}

/**
 * 
 * @param {string} id 
 * @param {Function} fn 
 * @param {any} [defaultValue = null] 
 */
export const withSample = (samplesByID, id, fn, defaultValue = null) => {
  if (!id)
    return defaultValue

  const sample = samplesByID[id]

  if (!sample) {
    store.dispatch(Sample.get(id))      
    return defaultValue
  }

  if (sample.isFetching)
    return defaultValue

  return fn(sample)
}

/**
 * 
 * @param {string} id 
 * @param {Function} fn 
 * @param {any} [defaultValue = null] 
 */
export const withIndividual = (individualsByID, id, fn, defaultValue = null) => {
  if (!id) {
    return defaultValue
  }
  
  const individual = individualsByID[id]

  if (!individual) {
    store.dispatch(Individual.get(id))      
    return defaultValue
  }

  if (individual.isFetching)
    return defaultValue

  return fn(individual)
}

export default {
  withContainer,
  withSample,
  withIndividual
};
