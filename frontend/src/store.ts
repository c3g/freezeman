// import { applyMiddleware, createStore, compose } from 'redux'
import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'
import thunkMiddleware from 'redux-thunk'
import logger from 'redux-logger'

import rootReducer from './reducers'

const store = configureStore({
	reducer: rootReducer,
	middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(thunkMiddleware, logger)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// TODO hot loading of reducers
// https://redux.js.org/usage/configuring-your-store#hot-reloading


export default store


