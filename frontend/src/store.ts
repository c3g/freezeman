import { ThunkMiddleware, configureStore } from '@reduxjs/toolkit'
import { createLogger } from 'redux-logger'
import rootReducer from './reducers'
import { notifyError } from './modules/notification/actions'
import { logOut } from './modules/auth/actions'
import shouldIgnoreError from './utils/shouldIgnoreError'

const logger = createLogger({
	level: 'info'
})

const notificationError: ThunkMiddleware = ({ dispatch }) => next => action => {
	const TOKEN_EXPIRED_MESSAGE = 'Given token not valid for any token type'

	function getErrorDescription(error: any) {
		/* HTTP errors are handled specially because they include the URL
		 * in the error message and we don't want many very similar errors
		 * to show up, just show one.
		 */
		if (typeof error.status === 'number')
			return {
				message: `HTTP Error ${error.status}: ${error.statusText}`,
				details: error.url,
			}

		return {
			message: error.message,
			details: error.stack,
		}
	}

	if (!action.error)
		return next(action)

	if (action.error.message.includes(TOKEN_EXPIRED_MESSAGE)) {
		dispatch(logOut())
		return next(action)
	}

	if (shouldIgnoreError(action))
		return next(action)

	const error = getErrorDescription(action.error)
	dispatch(notifyError({
		id: error.message,
		title: error.message,
		description: error.details,
		duration: 0,
	}))

	return next(action)
}

const store = configureStore({
	reducer: rootReducer,
	// Disable immutable check because it throws an exception if withItem() tries to modify
	// state during the React render cycle. We can restore it once that problem is fixed.
	// Serializable check is also disabled because Error objects get stored but they are
	// not considered serializable.
	middleware: (getDefaultMiddleware) => [
		...getDefaultMiddleware({immutableCheck: false, serializableCheck: false}),
		logger,
		notificationError,
	]
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// TODO hot loading of reducers
// https://redux.js.org/usage/configuring-your-store#hot-reloading


export default store


