import { merge, del } from 'object-path-immutable'
import { ItemsByID, Study } from '../../models/frontend_models'
import { createNetworkActionTypes } from '../../utils/actions'
import { indexByID } from '../../utils/objects'

import { resetTable } from '../../utils/reducers'

export const GET = createNetworkActionTypes('STUDIES.GET')
export const ADD = createNetworkActionTypes('STUDIES.ADD')
export const UPDATE = createNetworkActionTypes('STUDIES.UPDATE')
export const LIST = createNetworkActionTypes('STUDIES.LIST')
export const REMOVE = createNetworkActionTypes('STUDIES.REMOVE')
export const LIST_PROJECT_STUDIES = createNetworkActionTypes('STUDIES.LIST_PROJECT_STUDIES')


interface StudiesState {
    itemsByID: ItemsByID<Study>,
    items: Study[]
    isFetching: boolean
	isRemoving: boolean
    error?: any
}

// TODO Do we need pagination, filtering and sorting in the studies state?
export const studies = (
	state : StudiesState = {
		itemsByID: {} as ItemsByID<Study>,
		items: [],
		isFetching: false,
		isRemoving: false,
	},
	action
) : StudiesState => {
	switch (action.type) {
		case GET.REQUEST:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { id: action.meta?.id, isFetching: true })
		case GET.RECEIVE:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false })
		case GET.ERROR:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, didFail: true })

		case ADD.REQUEST:
			return { ...state, error: undefined, isFetching: true }
		case ADD.RECEIVE:
			return merge<StudiesState>(resetTable({ ...state, isFetching: false }), ['itemsByID', action.data.id], preprocess(action.data))
		case ADD.ERROR:
			return { ...state, error: action.error, isFetching: false }

		case UPDATE.REQUEST:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { id: action.meta?.id, isFetching: true })
		case UPDATE.RECEIVE:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false, versions: undefined })
		case UPDATE.ERROR:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false })

		case LIST_PROJECT_STUDIES.REQUEST:
			return { ...state, isFetching: true }
		case LIST_PROJECT_STUDIES.RECEIVE: {
			const results = action.data.results.map(preprocess)
			return {
				...state,
				items: action.data,
				itemsByID: indexByID(results),
				isFetching: false
			}
		}
		case LIST_PROJECT_STUDIES.ERROR:
			return { ...state, isFetching: false, error: action.error, };
		
		case REMOVE.REQUEST:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { id: action.meta?.id, isRemoving: true })
		case REMOVE.RECEIVE:
			return del<StudiesState>(state, ['itemsByID', action.meta.id])
		case REMOVE.ERROR:
			return merge<StudiesState>(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, isRemoving: false, didFail: true })
	}
    return state
}

function preprocess(study) {
	study.isFetching = false
	study.isLoaded = true
	return study
}
