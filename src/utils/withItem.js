import Container from "../modules/containers/actions.js"
import Sample from "../modules/samples/actions.js"
import Individual from "../modules/individuals/actions.js"
import {networkAction} from "./actions";
import api from ".//api"
import wait from "./wait"

const THROTTLE_DELAY = 20

let store = undefined

/** Initialized in src/index.js */
export const setStore = value => { store = value }

function createWithItem(type, apiType) {
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
        const params = {
          id__in: Array.from(ids).join(',')
        }
        const listAction = store.dispatch(type.list(params))
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
  const withItem = (containersByID, id, fn, defaultValue = null) => {
    if (!id)
      return defaultValue

    const container = containersByID[id]

    if (!container) {
      requestItem(id)
      return defaultValue
    }

    if (container.isFetching)
      return defaultValue

    return fn(container)
  }

  return withItem
}

export const withContainer = createWithItem(Container, api.containers)
export const withSample = createWithItem(Sample, api.samples)
export const withIndividual = createWithItem(Individual, api.individuals)
export default {
  withContainer,
  withSample,
  withIndividual
};
