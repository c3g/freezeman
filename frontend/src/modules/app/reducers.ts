import { AnyAction } from "redux"
import { SET_APP_INITIALIZED } from "./actions"

export interface AppState {
	initialized: boolean
}

const INITIAL_STATE : AppState = {
	initialized : false			// True once initial data has been loaded at startup
}

export function app(state: AppState = INITIAL_STATE, action: AnyAction) {
	switch(action.type) {
		case SET_APP_INITIALIZED: {
			return {
				...state,
				initialized: true
			}
		}
	}
	return state
}