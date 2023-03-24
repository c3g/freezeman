import { merge } from 'object-path-immutable'
import { createNetworkActionTypes } from '../../utils/actions'

import { indexByID } from '../../utils/objects'

export const GET = createNetworkActionTypes("WORKFLOWS.GET");
export const LIST = createNetworkActionTypes("WORKFLOWS.LIST");

export const workflows = (
	state = {
		itemsByID: {},
		items: [],
		page: { offset: 0 },
		totalCount: 0,
		isFetching: false,
		filters: {},
		sortBy: { key: undefined, order: undefined },
	},
	action
) => {
	switch (action.type) {
		case GET.REQUEST:
			return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true })
		case GET.RECEIVE:
			return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false })
		case GET.ERROR:
			return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, didFail: true })

		case LIST.REQUEST:
			return { ...state, isFetching: true }
		case LIST.RECEIVE: {
			const results = action.data.results.map(preprocess)
			const itemsByID = merge(state.itemsByID, [], indexByID(results))
			return { ...state, itemsByID, isFetching: false, error: undefined }
		}
		case LIST.ERROR:
			return { ...state, isFetching: false, error: action.error }

		default:
			return state
	}
}

function preprocess(workflow) {
	workflow.isFetching = false
	workflow.isLoaded = true
	return workflow
}
