import { useCallback, useMemo } from 'react'
import { useAppSelector } from '../../hooks'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, FilterValue } from '../../models/paged_items'
import { selectAppInitialized } from '../../selectors'
import { addFiltersToColumns } from './MergeColumnsAndFilters'
import { IdentifiedTableColumnType } from './PagedItemsColumns'
import { PagedItemsActionsCallbacks } from './PagedItemsTable'


/*  This is a hook that merges column definitions with filter definitions to produce
	complete column descriptions for the table.
*/
export function useFilteredColumns<T>(
	columns: IdentifiedTableColumnType<T>[],
	filterDefinitions: FilterDescriptionSet,
	filterKeys: FilterKeySet,
	filters: FilterSet,
	setFilterCallback: PagedItemsActionsCallbacks['setFilterCallback'],
	setFilterOptionsCallback: PagedItemsActionsCallbacks['setFilterOptionsCallback']
) {
	// This is a hack for SELECT filters that need static redux state that is loaded when
	// the app starts. It forces the filters to be rebuilt after the static data has been
	// loaded. This is needed when the user reloads a page containing a table with dynamic
	// filter values initialize from static app state. Ideally, we wouldn't render the UX
	// until after the static data is loaded, in which case we wouldn't need hacks like this.
	const isAppInitialized = useAppSelector(selectAppInitialized)

	const wrappedSetFilterCallback = useCallback(
		(filterKey: string, value: FilterValue, description: FilterDescription) => {
			setFilterCallback(value, description)
		},
		[setFilterCallback]
	)

	const wrappedSetFilterOptionsCallback = useCallback(
		(filterKey: string, propertyName: string, value: boolean, description: FilterDescription) => {
			setFilterOptionsCallback(description, { [propertyName]: value })
		},
		[setFilterOptionsCallback]
	)

	const tableColumns = useMemo(() => {
		const mergedColumns = addFiltersToColumns(
			columns,
			filterDefinitions ?? {},
			filterKeys ?? {},
			filters ?? {},
			wrappedSetFilterCallback,
			wrappedSetFilterOptionsCallback
		)
		return mergedColumns
	}, [columns, filterDefinitions, filterKeys, filters, wrappedSetFilterCallback, wrappedSetFilterOptionsCallback, isAppInitialized])

	return tableColumns
}
