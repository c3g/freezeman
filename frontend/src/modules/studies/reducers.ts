import { merge } from 'object-path-immutable'
import { ItemsByID, Study } from '../../models/frontend_models'
import { createNetworkActionTypes } from '../../utils/actions'
import { indexByID } from '../../utils/objects'

import { resetTable } from '../../utils/reducers'

import STUDIES from './actions'

export const GET = createNetworkActionTypes('STUDIES.GET')
export const ADD = createNetworkActionTypes('STUDIES.ADD')
export const UPDATE = createNetworkActionTypes('STUDIES.UPDATE')
export const LIST = createNetworkActionTypes('STUDIES.LIST')
export const LIST_PROJECT_STUDIES = createNetworkActionTypes('STUDIES.LIST_PROJECT_STUDIES')


interface StudiesState {
    itemsByID: ItemsByID<Study>,
    items: Study[]
    isFetching: boolean
    error?: any
}

// TODO Do we need pagination, filtering and sorting in the studies state?
export const studies = (
	state : StudiesState = {
		itemsByID: {} as ItemsByID<Study>,
		items: [],
		isFetching: false
	},
	action
) : StudiesState => {
	switch (action.type) {
		case STUDIES.GET.REQUEST:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { id: action.meta?.id, isFetching: true })
		case STUDIES.GET.RECEIVE:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false })
		case STUDIES.GET.ERROR:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, didFail: true })

		case STUDIES.ADD.REQUEST:
			return { ...state, error: undefined, isFetching: true }
		case STUDIES.ADD.RECEIVE:
			return merge<StudiesState>(resetTable({ ...state, isFetching: false }), ['itemsByID', action.data.id], preprocess(action.data))
		case STUDIES.ADD.ERROR:
			return { ...state, error: action.error, isFetching: false }

		case STUDIES.UPDATE.REQUEST:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { id: action.meta?.id, isFetching: true })
		case STUDIES.UPDATE.RECEIVE:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false, versions: undefined })
		case STUDIES.UPDATE.ERROR:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false })

		case STUDIES.LIST_PROJECT_STUDIES.REQUEST:
			return { ...state, isFetching: true }
		case STUDIES.LIST_PROJECT_STUDIES.RECEIVE: {
			const results = action.data.results.map(preprocess)
			return {
				...state,
				items: action.data,
				itemsByID: indexByID(results),
				isFetching: false
			}
		}
		case STUDIES.LIST_PROJECT_STUDIES.ERROR:
			return { ...state, isFetching: false, error: action.error, };
	}
    return state
}

function preprocess(study) {
	study.isFetching = false
	study.isLoaded = true
	return study
}
