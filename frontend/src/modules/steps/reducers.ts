import { AnyAction } from "redux"
import { FMSStep } from "../../models/fms_api_models"
import { createItemsByID, ItemsByID } from "../../models/frontend_models"
import ACTIONS from './actions'

export interface StepsState {
	isFetching: boolean
	itemsByID: ItemsByID<FMSStep>
	error?: any
}

const INITIAL_STATE = {
	isFetching: false,
	itemsByID: {}
}

export const steps = (state: StepsState = INITIAL_STATE, action: AnyAction) : StepsState => {
	switch(action.type) {
		case ACTIONS.LIST.REQUEST: {
			return {
				...state,
				isFetching: true,
				error: undefined
			}
		}

		case ACTIONS.LIST.RECEIVE: {
			const { data } = action
			return {
				...state,
				isFetching: false,
				itemsByID: createItemsByID(data.results),
				error: undefined
			}
		}

		case ACTIONS.LIST.ERROR: {
			const { error } = action
			return {
				...state,
				isFetching: false,
				error
			}
		}
	}
	return state
}

export default steps