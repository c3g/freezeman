import { configureStore } from '@reduxjs/toolkit'
import { createLogger } from 'redux-logger'
import rootReducer from './reducers'


const logger = createLogger({
	// Note: Ideally, all redux-logger messages would be output in trace (debug) mode,
	// so that we could turn them off when we don't need them. Unfortunately, each redux
	// action is logged using a console 'group', and browsers don't support logging groups
	// in debug mode, so the group message always appears in the console at the info level. 
	// We would have to drop redux-logger and use something else for logging redux actions if
	// we wanted to get rid of those group messages from the console.

	// Collapse the action message groups by default, to avoid polluting the console.
	collapsed: () => true,
	predicate: (getState, action) => {
		// Disable redux logging of summary actions, unless there is a summary error.
		// Summaries pollute the log.
		if (action.type.includes('.SUMMARY.REQUEST' || action.type.include('.SUMMARY.RECEIVE'))) {
			return false
		}
		return true
	},
})

const store = configureStore({
	reducer: rootReducer,
	// Disable immutable check because it throws an exception if withItem() tries to modify
	// state during the React render cycle. We can restore it once that problem is fixed.
	// Serializable check is also disabled because Error objects get stored but they are
	// not considered serializable.
	middleware: (getDefaultMiddleware) => getDefaultMiddleware({immutableCheck: false, serializableCheck: false}).concat(logger)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// TODO hot loading of reducers
// https://redux.js.org/usage/configuring-your-store#hot-reloading


export default store


