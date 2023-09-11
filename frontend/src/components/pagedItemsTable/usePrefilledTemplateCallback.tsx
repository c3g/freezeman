import { useCallback } from "react"
import { useAppSelector } from "../../hooks"
import { selectAuthTokenAccess } from "../../selectors"
import api, { withToken } from "../../utils/api"
import { FilterSet, SortBy } from "../../models/paged_items"
import { filtersQueryParams } from "./serializeFilterParamsTS"

type PrefillFunc = typeof api.samples.prefill.request

/**
 * This utility creates a function for requesting a prefilled template, to be hooked up to a
 * PrefilledTemplatesDropdown or PrefilledTemplatesButton.
 * 
 * @param prefillFunc 	An 'api.xxx.prefill.request' function
 * @param filters 	The current state of the filters in a table
 * @param sortBy 	The current sort order in a table
 * @returns 
 */
export function usePrefilledTemplateCallback(prefillFunc: PrefillFunc, filters: FilterSet, sortBy: SortBy) {
	const token = useAppSelector(selectAuthTokenAccess)

	return useCallback(({template}) =>
		withToken(token, prefillFunc)(filtersQueryParams(filters, sortBy), template)
		.then(response => response)
	, [filters, prefillFunc, sortBy, token])
}