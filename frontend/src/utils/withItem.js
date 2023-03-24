import Container from "../modules/containers/actions.js"
import Sample from "../modules/samples/actions.js"
import Individual from "../modules/individuals/actions.js"
import User from "../modules/users/actions.js"
import Process from "../modules/processMeasurements/actions.js"
import Project from "../modules/projects/actions.js"
import Sequence from "../modules/sequences/actions.js"
import Index from "../modules/indices/actions.js"
import Library from "../modules/libraries/actions.js"
import Taxon from "../modules/taxons/actions.js"
import ReferenceGenome from "../modules/referenceGenomes/actions.js"

import {networkAction} from "./actions";
import api from ".//api"
import wait from "./wait"

const THROTTLE_DELAY = 20
const MAX_IDS_BY_REQUEST = 1000

let store = undefined

/** Initialized in src/index.js */
export const setStore = value => { store = value }

export function createWithItem(type, apiType) {
  /*
   * Create a withXxx() helpers.
   * Requests are accumulated in `ids` for `THROTTLE_DELAY`
   * in `requestItem`, then sent out in batch in `fetchList`.
   * This allows to make a single request with multiple items
   * rather than multiple single-item requests.
   */

  let ids = new Set()
  let delayedAction

  const requestItem = (id) => {
    if (ids.has(id))
      return
    store.dispatch({ type: type.GET.REQUEST, meta: { id } })
    ids.add(id)
    if (delayedAction)
      return
    fetchList()
  }

  const fetchList = () => {
    delayedAction =
      wait(THROTTLE_DELAY).then(async () => {
        const chunkedParams = []
        for(let i = 0; i < ids.size; i = i + MAX_IDS_BY_REQUEST){
          chunkedParams.push({id__in: Array.from(ids).slice(i, i + MAX_IDS_BY_REQUEST).join(',')})
        }

        const listAction = Promise.all(chunkedParams.map(async (params) => store.dispatch(type.list(params))))
        ids = new Set()
        await listAction
        delayedAction = undefined
        // Some items were added while we were fetching the ids
        if (ids.size > 0)
          fetchList()
      })
  }

  /**
   * @param {string} id
   * @param {Function} fn
   * @param {any} [defaultValue = null]
   */
  const withItem = (itemsByID, id, fn, defaultValue = null) => {
    if (!id)
      return defaultValue

    const item = itemsByID[id]

    if (!item) {
      requestItem(id)
      return defaultValue
    }

    if (item.isFetching)
      return defaultValue

    return fn(item)
  }

  return withItem
}

export const withContainer = createWithItem(Container, api.containers)
export const withSample = createWithItem(Sample, api.samples)
export const withIndividual = createWithItem(Individual, api.individuals)
export const withUser = createWithItem(User, api.users)
export const withProcess = createWithItem(Process, api.processes)
export const withProcessMeasurement = createWithItem(Process, api.processMeasurements)
export const withProject = createWithItem(Project, api.projects)
export const withSequence = createWithItem(Sequence, api.sequences)
export const withIndex = createWithItem(Index, api.indices)
export const withLibrary = createWithItem(Library, api.libraries)
export const withTaxon = createWithItem(Taxon, api.taxons)
export const withReferenceGenome = createWithItem(ReferenceGenome, api.referenceGenomes)

export default {
  withContainer,
  withSample,
  withIndividual,
  withUser,
  withProcess,
  withProcessMeasurement,
  withProject,
  withSequence,
  withIndex,
  withLibrary,
  withTaxon,
  withReferenceGenome,
};
