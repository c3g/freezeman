import { useCallback } from 'react'
import { withToken } from '../../utils/api'
import { useAppSelector } from '../../hooks'
import { selectAuthTokenAccess } from '../../selectors'
import { filtersQueryParams } from './serializeFilterParamsTS'
import { FilterSet, SortBy } from '../../models/paged_items'
import api from '../../utils/api'


type ListExportFunc = typeof api.samples.listExport		// Just letting typescript figure out this type :)

/**
 * Utility to create a callback function that can be passed to the ExportButton component
 * to export table data.
 * 
 * The hook takes an api 'export' function, along with the current state of the table's filters and sortBy and
 * returns a callback function that can be used to fetch the exported data.
 * 
 * @param listExport 
 * @param filters 
 * @param sortBy 
 * @returns 
 */
export default function useListExportCallback(listExport: ListExportFunc, filters: FilterSet, sortBy: SortBy) {
	const token = useAppSelector(selectAuthTokenAccess)

	return useCallback(() => {
		return withToken(token, listExport)(filtersQueryParams(filters, sortBy))
		.then(response => response.data)

	}, [filters, listExport, sortBy, token])
}