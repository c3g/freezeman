import { Checkbox, Pagination, PaginationProps, Table, TableProps } from 'antd'
import { TableRowSelection } from 'antd/lib/table/interface'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppDispatch } from '../../hooks'
import { FilterDescription, FilterOptions, FilterSetting, FilterValue, PageableData, PagedItems, SortBy } from '../../models/paged_items'
import { setPageSize as setPageSizeForApp } from '../../modules/pagination'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import { IdentifiedTableColumnType } from './PagedItemsColumns'
import { useRefreshWhenStale } from './useRefreshWhenStale'


export interface PagedItemTableSelection {
	onSelectionChanged: (exceptedItems: React.Key[], defaultSelection: boolean) => void
}

// This is the set of possible callbacks for the paged items table.
export interface PagedItemsActionsCallbacks {
	listPageCallback: (pagedNumber: number) => Promise<void>
	setFixedFilterCallback: (filter: FilterSetting) => void
	setFilterCallback: (value: FilterValue, description: FilterDescription) => Promise<void>
	setFilterOptionsCallback: (description: FilterDescription, options: FilterOptions) => Promise<void>
	clearFiltersCallback: () => Promise<void>
	setSortByCallback: (sortByList: SortBy[]) => Promise<void>
	setPageSizeCallback: (pageSize: number) => Promise<void>
	resetPagedItemsCallback: () => Promise<void>
	setStaleCallback: (stale: boolean) => Promise<void>
	refreshPageCallback: () => Promise<void>
}

export interface DataObjectsByID<T> {
	[key: string] : T
}
export type GetDataObjectsByIDCallback<T> = (ids: number[]) => Promise<DataObjectsByID<T>>


export interface PagedItemsTableProps<T extends PageableData> extends PagedItemsActionsCallbacks {
	// The paged items table only has a list of item ID's. You have provide a function
	// that maps those ID's to data objects which get rendered by the table.
	getDataObjectsByID: GetDataObjectsByIDCallback<T>
	pagedItems: PagedItems

	columns: IdentifiedTableColumnType<T>[]
	fixedFilter?: FilterSetting

	// If true, a FiltersBar component is rendered with the table.
	usingFilters: boolean

	selection?: PagedItemTableSelection
	expandable?: TableProps<T>['expandable']
	initialLoad?: boolean

	topBarExtra?: React.ReactNode[]

	scroll?: TableProps<T>['scroll']
	paginationProps?: PaginationProps
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
	expandable,
	topBarExtra,
	scroll = { x: '100%', y: '70vh' },
	paginationProps,
}: PagedItemsTableProps<T>) {
	const dispatch = useAppDispatch()

	const { items, stale } = pagedItems
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
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

	// Return the ID that corresponds to the object displayed in a row of the table.
	// We just find the object in the dataObjects map and return its corresponding
	// key. This allows us to use data objects that don't have an explicit 'id' property.
	const getRowKeyForDataObject = useCallback((data: T) => {
		let foundKey = ''
		for (const key in tableDataState.objectMap) {
			if (tableDataState.objectMap[key] === data) {
				 foundKey = key
			}
		}
		return foundKey
	}, [tableDataState.objectMap])

	const [defaultSelection, setDefaultSelection] = useState(false)
	const [exceptedItems, setExceptedItems] = useState<React.Key[]>([])
	const allIsSelected = (!defaultSelection && exceptedItems.length === pagedItems.totalCount) || (defaultSelection && exceptedItems.length === 0)
	const noneIsSelected = (!defaultSelection && exceptedItems.length === 0) || (defaultSelection && exceptedItems.length === pagedItems.totalCount)

	const onSelectAll = useCallback(() => {
		const newExceptedItems = []
		const newDefaultSelection = !allIsSelected

		setExceptedItems(newExceptedItems)
		setDefaultSelection(newDefaultSelection)
		if (selection)
			selection.onSelectionChanged(newExceptedItems, newDefaultSelection)
	}, [allIsSelected, selection])
	const onSelectSingle = useCallback((record: T) => {
		const key = getRowKeyForDataObject(record)
		let newExceptedItems = exceptedItems
		if (exceptedItems.includes(key)) {
			newExceptedItems = exceptedItems.filter((id) => id !== key)
		} else {
			newExceptedItems = [...exceptedItems, key]
		}
		setExceptedItems(newExceptedItems)
		if (selection) {
			selection.onSelectionChanged(newExceptedItems, defaultSelection)
		}
	}, [getRowKeyForDataObject, defaultSelection, exceptedItems, selection])
	const onSelectMultiple = useCallback((keys: React.Key[]) => {
		if (pagedItems.page?.pageNumber !== undefined && pagedItems.page.limit !== undefined) {
			const offset = (pagedItems.page.pageNumber - 1) * pagedItems.page.limit
			const keysOnPage = pagedItems.items.slice(offset, offset + pagedItems.page.limit).map((id) => id.toString() as React.Key)
			const missingKeys = keysOnPage.filter((key) => !keys.includes(key))
			const newExceptedItems = defaultSelection
				// if defaultSelection is true, we want to remove items in keys from exceptedItems to select them
				? exceptedItems.filter((key) => !keys.includes(key))
				// if defaultSelection is false, we want to add new items to exceptedItems to select them
				: [...exceptedItems, ...keys]
			console.info('onSelectMultiple', {
				keys,
				keysOnPage,
				missingKeys,
			})
			setExceptedItems(newExceptedItems)
			if (selection) {
				selection.onSelectionChanged(newExceptedItems, defaultSelection)
			}
		}
	}, [defaultSelection, exceptedItems, pagedItems.items, pagedItems?.page?.limit, pagedItems?.page?.pageNumber, selection])
	const selectedRowKeys = useMemo(() =>
		defaultSelection
			? pagedItems.items.map((id) => id.toString()).filter((key) => !exceptedItems.includes(key))
			: exceptedItems,
	[pagedItems.items, defaultSelection, exceptedItems])
	const rowSelection: TableRowSelection<T> | undefined = useMemo(() => {
		if (selection) {
			const indeterminate = !allIsSelected && !noneIsSelected
			return {
				type: 'checkbox',
				selectedRowKeys,
				onChange(selectedRowKeys, selectedRows, info) {
					if (info.type === 'all') {
						onSelectAll()
					}
					if (info.type === 'multiple') {
						// shift is held
						onSelectMultiple(selectedRowKeys)
					}
				},
				onSelect: onSelectSingle,
				columnTitle: (
					<Checkbox
						checked={!noneIsSelected}
						indeterminate={indeterminate}
						onChange={onSelectAll}
					/>
				)
			}
		}
		return undefined
	}, [allIsSelected, noneIsSelected, onSelectAll, onSelectSingle, onSelectMultiple, selectedRowKeys, selection])

	// avoid dilema selectAll and selectedItems logic
	useEffect(() => {
		setDefaultSelection(false)
		setExceptedItems([])
		selection?.onSelectionChanged([], false)
	}, [pagedItems.filters, pagedItems.fixedFilters, selection])

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

	return (
		<>
			{columns && (
				<>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5em' }}>
						<div>{topBarExtra}</div>
						{usingFilters && pagedItems.filters && (
							<FiltersBar filters={pagedItems.filters} clearFilters={clearFiltersCallback} buttonStyle={{ margin: 0 }}/>
						)}
					</div>
					<Table<T>
						expandable={expandable}
						rowSelection={rowSelection}
						dataSource={tableDataState.tableData}
						columns={columns}
						rowKey={getRowKeyForDataObject}
						scroll={scroll}
						pagination={false}
						bordered={true}
						loading={pagedItems.isFetching}
						className={"ant-table-cells-short ant-table-header-short"}
						onChange={(pagination, filters, sorter) => {
							if (Array.isArray(sorter)) {
								setSortByCallback(sorter.map(({ columnKey, order }) => ({ key: columnKey?.toString() ?? '', order: order === 'ascend' ? 'ascend' : 'descend' })))
							} else {
								setSortByCallback([{ key: sorter.columnKey?.toString() ?? '', order: sorter.order === 'ascend' ? 'ascend' : 'descend' }])
							}
						}}
					/>
					<Pagination
						className="ant-table-pagination"
						showSizeChanger={true}
						showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
						current={pagedItems.page?.pageNumber ?? 0}
						pageSize={pagedItems.page?.limit ?? 0}
						total={pagedItems.totalCount}
						onChange={listPageCallback}
						onShowSizeChange={(current, newPageSize) => pageSizeCallback(newPageSize)}
						{...paginationProps}
					/>
				</>
			)}
		</>
	)
}

export default PagedItemsTable
