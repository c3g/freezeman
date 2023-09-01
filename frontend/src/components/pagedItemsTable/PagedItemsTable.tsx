import { Pagination, Table, TableProps } from 'antd'
import { TableRowSelection } from 'antd/lib/table/interface'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSTrackedModel } from '../../models/fms_api_models'
import { ItemsByID } from '../../models/frontend_models'
import { DataID, FilterDescription, FilterDescriptionSet, FilterKeySet, FilterOptions, FilterSet, FilterSetting, FilterValue, PageableData, PagedItems, SortBy } from '../../models/paged_items'
import { PagedItemsActions } from '../../models/paged_items_factory'
import { setPageSize as setPageSizeForApp } from '../../modules/pagination'
import { RootState } from '../../store'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import { addFiltersToColumns } from './MergeColumnsAndFilters'
import { IdentifiedTableColumnType } from './PagedItemsColumns'
import { selectAppInitialized } from '../../selectors'


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

/**
 * Given an instance of PagedItemsActions, this hook returns a set of callbacks
 * that are given to the PagedItemsTable, and which will dispatch the actions
 * when called from the table.
 * 
 * This is just a utility to make it easy to pass the callbacks to the table, when
 * you don't need to implement custom callbacks for the table functions.
 * 
 * @param pagedItemActions 
 * @returns 
 */
export function usePagedItemsActionsCallbacks(pagedItemActions: PagedItemsActions): PagedItemsActionsCallbacks {
	const dispatch = useAppDispatch()
	return useMemo(() => {
		const listPageCallback = (pageNumber: number) => {
			dispatch(pagedItemActions.listPage(pageNumber))
		}

		const setFixedFilterCallback = (filter: FilterSetting) => {
			dispatch(pagedItemActions.setFixedFilter(filter))
		}

		const setFilterCallback = (value: FilterValue, description: FilterDescription) => {
			dispatch(pagedItemActions.setFilter(value, description))
		}

		const setFilterOptionsCallback = (description: FilterDescription, options: FilterOptions) => {
			dispatch(pagedItemActions.setFilterOptions(description, options))
		}

		const clearFiltersCallback = () => {
			dispatch(pagedItemActions.clearFilters())
		}

		const setSortByCallback = (sortBy: SortBy) => {
				dispatch(pagedItemActions.setSortBy(sortBy))
		}

		const setPageSizeCallback =(pageSize: number) => {
			dispatch(pagedItemActions.setPageSize(pageSize))
		}

		const resetPagedItemsCallback = () => {
			dispatch(pagedItemActions.resetPagedItems())
		}

		const setStaleCallback = (stale: boolean) => {
			dispatch(pagedItemActions.setStale(stale))
		}

		const refreshPageCallback = () => {
			dispatch(pagedItemActions.refreshPage())
		}

		return {
			listPageCallback,
			setFixedFilterCallback,
			setFilterCallback,
			setFilterOptionsCallback,
			clearFiltersCallback,
			setSortByCallback,
			setPageSizeCallback,
			resetPagedItemsCallback,
			setStaleCallback,
			refreshPageCallback,	
		}
	}, [dispatch, pagedItemActions])
}

/**
 * This hook can be used for the getDataObjectsByID callback, if a simple selector
 * can be used to lookup the data items displayed in the table, such as projectByID
 * or samplesByID.
 * 
 * The hook returns a callback function that takes a list of item ID's as input
 * and outputs an object mapping the id's to data objects.
 * 
 * The transform function is used to convert from the data type stored in itemsByID
 * to the data type used in the table. Normally this is to transform something like a
 * project to an object containing a project, ie.
 * 
 * {
 * 	project: <some project>
 * }
 * 
 * This hook is intended for simple tables such as the samples, containers, individuals,
 * projects and libraries tables. For more complicated tables (such as workflow tables)
 * you should probably write your own custom function.
 * 
 * @param itemsByIDSelector 
 * @returns 
 */
export function useItemsByIDToDataObjects<T extends FMSTrackedModel, D>(
	itemsByIDSelector: (state: RootState) => ItemsByID<T>,
	transform: (item: T) => D
) {
	const itemsByID = useAppSelector(itemsByIDSelector)
	
	const callback = useCallback((ids: DataID[]) => {
		async function mapItemIDs(ids: DataID[]) : Promise<DataObjectsByID<D>> {
			return ids.reduce((acc, id) => {
				const item = itemsByID[id]
				if (item) {
					acc[id] = transform(item)
				}
				return acc
			}, {})
		}

		return mapItemIDs(ids)
	}, [itemsByID, transform])

	return callback
}

/**
 * This hook creates a callback that automatically refreshes the table if
 * the stale flag in PagedItems is set. The flag is cleared and the table
 * items are refreshed.
 * 
 * PagedItems table will call the callback whenever the paged items state changes,
 * to check for the stale flag.
 * @param pagedItemActions 
 * @returns 
 */
export function useRefreshWhenStale(refreshPageCallback: PagedItemsActionsCallbacks['refreshPageCallback'], setStaleCallback: PagedItemsActionsCallbacks['setStaleCallback']) {
	const refreshWhenStale = useCallback((stale: PagedItems['stale']) => {
		if (stale) {
			refreshPageCallback()
			setStaleCallback(false)
		}
	}, [refreshPageCallback, setStaleCallback])

	return refreshWhenStale
}

export interface PagedItemTableSelection<T extends PageableData> {
	selectedItemIDs: DataID[]
	onSelectionChanged: (selectedItems: T[]) => void
}

// This is the set of possible callbacks for the paged items table.
export interface PagedItemsActionsCallbacks {
	listPageCallback: (pagedNumber: number) => void
	setFixedFilterCallback: (filter: FilterSetting) => void
	setFilterCallback: (value: FilterValue, description: FilterDescription) => void
	setFilterOptionsCallback: (description: FilterDescription, options: FilterOptions) => void
	clearFiltersCallback: () => void
	setSortByCallback: (sortBy: SortBy) => void
	setPageSizeCallback: (pageSize: number) => void
	resetPagedItemsCallback: () => void
	setStaleCallback: (stale: boolean) => void
	refreshPageCallback: () => void
}

export interface DataObjectsByID<T> {
	[key: string] : T | undefined
}
export type GetDataObjectsByIDCallback<T> = (ids: number[]) => Promise<DataObjectsByID<T>>


interface PagedItemsTableProps<T extends PageableData> extends PagedItemsActionsCallbacks {
	// The paged items table only has a list of item ID's. You have provide a function
	// that maps those ID's to data objects which get rendered by the table.
	getDataObjectsByID: GetDataObjectsByIDCallback<T>
	pagedItems: PagedItems

	columns: IdentifiedTableColumnType<T>[]
	fixedFilter?: FilterSetting
	usingFilters: boolean

	selection?: PagedItemTableSelection<T>

	initialLoad?: boolean
}

function PagedItemsTable<T extends object>({
	getDataObjectsByID,
	listPageCallback,
	setFixedFilterCallback,
	clearFiltersCallback,
	setSortByCallback,
	setPageSizeCallback,
	refreshPageCallback,
	setStaleCallback,
	pagedItems,
	columns,
	fixedFilter,
	usingFilters,
	selection,
	initialLoad = true,
}: PagedItemsTableProps<T>) {
	const dispatch = useAppDispatch()

	const { items, sortBy, stale } = pagedItems
	const [dataObjects, setDataObjects] = useState<DataObjectsByID<T>>({})

	// On initial load, trigger the fetch of one page of items
	useEffect(
		() => {
			if (!initialLoad) return;

			// If this table uses a fixed filter then set it before loading any items.
			if (fixedFilter && fixedFilter.description) {
				setFixedFilterCallback(fixedFilter)
			}

			// If a page isn't already loaded in redux then request page 1
			if (!pagedItems.page?.pageNumber) {
				listPageCallback(1)
			}
		},
		[
			/* Only call once when the component is mounted*/
		]
	)

	//
	useEffect(() => {
		async function retrieveItems(ids: number[]) {
			try {
				const objectMap = await getDataObjectsByID(ids)
				setDataObjects(objectMap)
			} catch (error) {
				console.error(error)
			}
		}
		retrieveItems([...items])
	}, [getDataObjectsByID, items])

	// Refresh the page if the paged items are marked as stale, if using 
	// the refresh mechanism.
	const refreshWhenStale = useRefreshWhenStale(refreshPageCallback, setStaleCallback)
	useEffect(() => {
			refreshWhenStale(stale)
	}, [stale, refreshWhenStale])

	const pageSizeCallback = useCallback(
		(pageSize) => {
			// TODO: It's unclear if limit should be part of the paged items data structure,
			// or if we should ALWAYS use the pageSize stored for the app. Right now, setting
			// the page size changes it for the current table and for the app.
			setPageSizeCallback(pageSize)
			dispatch(setPageSizeForApp(pageSize))
		},
		[dispatch, setPageSizeCallback]
	)

	// We use this callback to respond when the user sorts a column
	const sortByCallback: TableProps<any>['onChange'] = useCallback(
		(pagination, filters, sorterResult) => {
			if (!Array.isArray(sorterResult)) {
				const sorter = sorterResult
				const key = sorter.columnKey?.toString()
				const order = sorter.order ?? undefined
				if (key) {
					if (sortBy === undefined || key !== sortBy.key || order !== sortBy.order) {
						setSortByCallback({ key, order })
					}
				}
			}
		},
		[sortBy, setSortByCallback]
	)

	// If a selection listener is passed to the table then the listener is informed
	// every time the row selection is changed by the user.
	let rowSelection: TableRowSelection<T> | undefined = undefined
	if (selection) {
		rowSelection = {
			type: 'checkbox',
			onChange: (selectedRowKeys: React.Key[], selectedRows: T[]) => {
				selection.onSelectionChanged(selectedRows)
			},
			selectedRowKeys: [...selection.selectedItemIDs],
		}
	}

	// Get the objects by ID, in the order defined by 'items'
	const tableData = items.reduce((acc, id) => {
		const data = dataObjects[id]
		if (data) {
			acc.push(data)
		}
		return acc
	}, [] as T[])

	// Return the ID that corresponds to the object displayed in a row of the table.
	// We just find the object in the dataObjects map and return its corresponding
	// key. This allows us to use data objects that don't have an explicit 'id' property.
	function getRowKeyForDataObject(data: T) {
		for (const key in dataObjects) {
			if (dataObjects[key] === data) {
				return key
			}
		}
		return 'unknown-data-row-key'
	}

	return (
		<>
			{columns && (
				<>
					{usingFilters && pagedItems.filters && (
						<FiltersBar filters={pagedItems.filters} clearFilters={clearFiltersCallback}></FiltersBar>
					)}
					<Table
						rowSelection={rowSelection}
						dataSource={tableData}
						columns={columns}
						rowKey={getRowKeyForDataObject}
						scroll={{x: 300}}
						onChange={sortByCallback}
						pagination={false}
						bordered={true}
						loading={pagedItems.isFetching}
					/>
					{true && (
						<Pagination
							className="ant-table-pagination ant-table-pagination-right"
							showSizeChanger={true}
							showQuickJumper={true}
							showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
							current={pagedItems.page?.pageNumber ?? 0}
							pageSize={pagedItems.page?.limit ?? 0}
							total={pagedItems.totalCount}
							onChange={listPageCallback}
							onShowSizeChange={(current, newPageSize) => pageSizeCallback(newPageSize)}
						/>
					)}
				</>
			)}
		</>
	)
}

export default PagedItemsTable
