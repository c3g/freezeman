import { Pagination, Table, TableProps } from 'antd'
import { TableRowSelection } from 'antd/lib/table/interface'
import React, { useCallback, useEffect, useState } from 'react'
import { useAppDispatch } from '../../hooks'
import { DataID, FilterDescription, FilterOptions, FilterSetting, FilterValue, PageableData, PagedItems, SortBy } from '../../models/paged_items'
import { setPageSize as setPageSizeForApp } from '../../modules/pagination'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import { IdentifiedTableColumnType } from './PagedItemsColumns'
import { useRefreshWhenStale } from './useRefreshWhenStale'


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

interface TableDataState<T> {
	objectMap: DataObjectsByID<T>
	tableData: T[]
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
	const [tableDataState, setTableDataState] = useState<TableDataState<T>>({objectMap: {}, tableData: []})

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

	// When 'items' changes we have to fetch the data object corresponding with the item id's.
	// We build the list of data objects and put them in `tableData`, which is passed to the ant table.
	// We also create a map that maps object id's to objects, which is used to lookup row keys.
	useEffect(() => {
		async function retrieveItems(ids: number[]) {
			try {
				const objectMap = await getDataObjectsByID(ids)
				const tableData = items.reduce((acc, id) => {
					const data = objectMap[id]
					if (data) {
						acc.push(data)
					}
					return acc
				}, [] as T[])

				setTableDataState({objectMap, tableData})
			} catch (error) {
				console.error(error)
			}
		}
		retrieveItems([...items])
	}, [getDataObjectsByID, items])


	// Return the ID that corresponds to the object displayed in a row of the table.
	// We just find the object in the dataObjects map and return its corresponding
	// key. This allows us to use data objects that don't have an explicit 'id' property.
	function getRowKeyForDataObject(data: T) {
		for (const key in tableDataState.objectMap) {
			if (tableDataState.objectMap[key] === data) {
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
						dataSource={tableDataState.tableData}
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
