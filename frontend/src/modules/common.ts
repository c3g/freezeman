
/**
 * Defines a redux state that has data, along with a fetching flag
 * and an optional error.
 */
export interface FetchedState<T> {
	isFetching: boolean
	error?: any
	data?: T
}