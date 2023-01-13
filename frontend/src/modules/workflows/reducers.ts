import { merge } from 'object-path-immutable'

import { indexByID } from '../../utils/objects'

import WORKFLOWS from './actions'

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
		case WORKFLOWS.GET.REQUEST:
			return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true })
		case WORKFLOWS.GET.RECEIVE:
			return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false })
		case WORKFLOWS.GET.ERROR:
			return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, didFail: true })

		case WORKFLOWS.LIST.REQUEST:
			return { ...state, isFetching: true }
		case WORKFLOWS.LIST.RECEIVE: {
			const results = action.data.results.map(preprocess)
			const itemsByID = merge(state.itemsByID, [], indexByID(results))
			return { ...state, itemsByID, isFetching: false, error: undefined }
		}
		case WORKFLOWS.LIST.ERROR:
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
