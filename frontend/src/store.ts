import { configureStore } from '@reduxjs/toolkit'
import { createLogger } from 'redux-logger'
import rootReducer from './reducers'

const logger = createLogger({
	level: 'info'
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


