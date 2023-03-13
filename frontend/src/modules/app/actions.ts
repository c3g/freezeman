
export const SET_APP_INITIALIZED = 'APP:SET_APP_INITIALIZED'

/**
 * The app 'initialized' flag lets us know when the app has finished
 * loading its initial data (see fetchInitialData()). Until then, info like
 * protocol descriptions, workflow definitions, etc. might not be in redux yet.
 * 
 * Components that depend on initial data can use this flag to wait until the
 * data has been loaded before rendering.
 * 
 * @returns true when app has finished initialization
 */
export function setAppInitialized() {
	return {
		type: SET_APP_INITIALIZED
	}
}
