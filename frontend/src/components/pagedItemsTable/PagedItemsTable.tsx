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
import FiltersBar from '../filters/FiltersBar'
import { addFiltersToColumns } from '../shared/WorkflowSamplesTable/MergeColumnsAndFilters'
import { IdentifiedTableColumnType } from './PagedItemsColumns'


/*  This is a hook that merges column definitions with filter definitions to produce
	complete column descriptions for the table. 
*/
export function useFilteredColumns<T>(
	columns: IdentifiedTableColumnType<T>[],
	filterDefinitions: FilterDescriptionSet,
	filterKeys: FilterKeySet,
	filters: FilterSet,
	setFilterCallback: SetFilterCallback,
	setFilterOptionsCallback: SetFilterOptionsCallback
) {

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
	}, [columns, filterDefinitions, filterKeys, filters, wrappedSetFilterCallback, wrappedSetFilterOptionsCallback])

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
export function usePagedItemsActionsCallbacks(pagedItemActions: PagedItemsActions) {
	const dispatch = useAppDispatch()

	const listPageCallback = useCallback((pageNumber: number) => {
		dispatch(pagedItemActions.listPage(pageNumber))
	}, [dispatch, pagedItemActions])

	const setFixedFilterCallback = useCallback((filter: FilterSetting) => {
		dispatch(pagedItemActions.setFixedFilter(filter))
	}, [dispatch, pagedItemActions])

	const setFilterCallback = useCallback((value: FilterValue, description: FilterDescription) => {
		dispatch(pagedItemActions.setFilter(value, description))
	}, [dispatch, pagedItemActions])

	const setFilterOptionsCallback = useCallback((description: FilterDescription, options: FilterOptions) => {
		dispatch(pagedItemActions.setFilterOptions(description, options))
	}, [dispatch, pagedItemActions])

	const clearFiltersCallback = useCallback(() => {
		dispatch(pagedItemActions.clearFilters())
	}, [dispatch, pagedItemActions])

	const setSortByCallback = useCallback(
		(sortBy: SortBy) => {
			dispatch(pagedItemActions.setSortBy(sortBy))
		},
		[dispatch, pagedItemActions]
	)

	const setPageSizeCallback = useCallback((pageSize: number) => {
		dispatch(pagedItemActions.setPageSize(pageSize))
	}, [dispatch, pagedItemActions])

	const resetPagedItemsCallback = useCallback(() => {
		dispatch(pagedItemActions.resetPagedItems())
	}, [dispatch, pagedItemActions])

	const setStaleCallback = useCallback((stale: boolean) => {
		dispatch(pagedItemActions.setStale(stale))
	}, [dispatch, pagedItemActions])

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
	}
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
export function useRefreshWhenStale(pagedItemActions: PagedItemsActions) {

	const dispatch = useAppDispatch()

	const refreshWhenStale = useCallback((pagedItems: PagedItems) => {
		if (pagedItems.stale) {
			dispatch(pagedItemActions.setStale(false))
			dispatch(pagedItemActions.refreshPage())
		}
	}, [dispatch, pagedItemActions])

	return refreshWhenStale
}

export interface PagedItemTableSelection<T extends PageableData> {
	selectedItemIDs: DataID[]
	onSelectionChanged: (selectedItems: T[]) => void
}

// This is the set of callbacks required by the paged items table.
export type ListPageCallback = (pageNumber: number) => void
export type SetFixedFilterCallback = (filter: FilterSetting) => void
export type ClearFiltersCallback = () => void
export type SetSortByCallback = (sortBy: SortBy) => void
export type SetPageSizeCallback = (pageSize: number) => void
export type SetFilterCallback = (value: FilterValue, description: FilterDescription) => void
export type SetFilterOptionsCallback = (description: FilterDescription, options: FilterOptions) => void
export type RefreshWhenStaleCallback = (pagedItems: PagedItems) => void

export interface DataObjectsByID<T> {
	[key: string] : T | undefined
}
export type GetDataObjectsByIDCallback<T> = (ids: number[]) => Promise<DataObjectsByID<T>>


interface PagedItemsTableProps<T extends PageableData> {
	// The paged items table only has a list of item ID's. You have provide a function
	// that maps those ID's to data objects which get rendered by the table.
	getDataObjectsByID: GetDataObjectsByIDCallback<T>
	pagedItems: PagedItems

	// Callbacks required by the table to implement page loading, filtering and sorting.
	listPageCallback: ListPageCallback
	setFixedFilterCallback: SetFixedFilterCallback
	clearFiltersCallback: ClearFiltersCallback
	setSortByCallback: SetSortByCallback
	setPageSizeCallback: SetPageSizeCallback

	refreshWhenStale?: RefreshWhenStaleCallback

	columns: IdentifiedTableColumnType<T>[]
	fixedFilter?: FilterSetting
	usingFilters: boolean

	selection?: PagedItemTableSelection<T>
}

function PagedItemsTable<T extends object>({
	getDataObjectsByID,
	listPageCallback,
	setFixedFilterCallback,
	clearFiltersCallback,
	setSortByCallback,
	setPageSizeCallback,
	refreshWhenStale,
	pagedItems,
	columns,
	fixedFilter,
	usingFilters,
	selection,
}: PagedItemsTableProps<T>) {
	const dispatch = useAppDispatch()

	const { items, sortBy } = pagedItems
	const [dataObjects, setDataObjects] = useState<DataObjectsByID<T>>({})

	// On initial load, trigger the fetch of one page of items
	useEffect(
		() => {
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
	useEffect(() => {
		if (refreshWhenStale) {
			refreshWhenStale(pagedItems)
		}
	}, [pagedItems, refreshWhenStale])

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
						style={{ overflowX: 'auto' }}
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
