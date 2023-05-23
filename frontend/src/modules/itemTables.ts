import { AnyAction } from "redux"
import { PagedItems } from "../models/paged_items"
import { FMSTrackedModel } from "../models/fms_api_models"
import { merge } from "object-path-immutable"
import { Sample } from "../models/frontend_models"


function createItemsTableReducer<T extends FMSTrackedModel>(actionPrefix: string) {

	function itemsTableReducer(state: PagedItems<T>, action: AnyAction): PagedItems<T> {
		switch(action.type) {
			case `${actionPrefix}.REQUEST`: {
				return merge<PagedItems<T>>(state, ['itemsByID', action.meta.id], { id: action.meta?.id, isFetching: true })
			}
			case `${actionPrefix}.RECEIVE`: {
				return merge<PagedItems<T>>(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false })
			}
			case `${actionPrefix}.ERROR`: {
				return merge<PagedItems<T>>(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, didFail: true })
			}

			case `${actionPrefix}.SET_FILTER`: {
				break
			}

			case `${actionPrefix}.SET_FILTER_OPTION`: {
				break
			}

			case `${actionPrefix}.CLEAR_FILTERS`: {
				break
			}

			// ...etc...
		}
		return state
	}

	return itemsTableReducer
}

const samples = createItemsTableReducer<Sample>('SAMPLES')
const containers = createItemsTableReducer<Sample>('CONTAINERS')

function createItemsTableActionCreators<T extends FMSTrackedModel>(actionPrefix: string) {

	return {
		REQUEST: () => ({type: `${actionPrefix}.REQUEST`}),
		RECEIVE: (data: T[], meta: any) => ({type: `${actionPrefix}.RECEIVE`, data, meta}),
		ERROR: (error: any) => ({type: `${actionPrefix}`, error}),
		// ...etc
	}
}

const samplesTableActions = createItemsTableActionCreators<Sample>('SAMPLES')