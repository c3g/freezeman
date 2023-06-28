import { Pagination, Table, TableProps } from 'antd'
import { TableRowSelection } from 'antd/lib/table/interface'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch } from '../../hooks'
import { DataID, FilterDescription, FilterDescriptionSet, FilterKeySet, FilterOptions, FilterSet, FilterSetting, FilterValue, PageableData, PagedItems, SortBy } from '../../models/paged_items'
import { PagedItemsActions } from '../../models/paged_items_factory'
import { setPageSize as setPageSizeForApp } from '../../modules/pagination'
import FiltersBar from '../filters/FiltersBar'
import { addFiltersToColumns } from '../shared/WorkflowSamplesTable/MergeColumnsAndFilters'
import { IdentifiedTableColumnType } from '../shared/WorkflowSamplesTable/SampleTableColumns'

// TODO move this to its own file
/*  This is a hook that combines column definitions with filter definitions to produce
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

	return {
		listPageCallback,
		setFixedFilterCallback,
		setFilterCallback,
		setFilterOptionsCallback,
		clearFiltersCallback,
		setSortByCallback,
		setPageSizeCallback,
	}
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


interface PagedItemsTableProps<T extends PageableData> {
	// The paged items table only has a list of item ID's. You have provide a function
	// that maps those ID's to data objects which get rendered by the table.
	getDataObjectsByID: (ids: number[]) => Promise<T[]>	
	pagedItems: PagedItems

	// Callbacks required by the table to implement page loading, filtering and sorting.
	listPageCallback: ListPageCallback
	setFixedFilterCallback: SetFixedFilterCallback
	clearFiltersCallback: ClearFiltersCallback
	setSortByCallback: SetSortByCallback
	setPageSizeCallback: SetPageSizeCallback
	
	columns: IdentifiedTableColumnType<T>[]
	fixedFilter?: FilterSetting
	usingFilters: boolean

	selection?: PagedItemTableSelection<T>
}

function PagedItemsTable<T extends PageableData>({
	getDataObjectsByID,
	listPageCallback,
	setFixedFilterCallback,
	clearFiltersCallback,
	setSortByCallback,
	setPageSizeCallback,
	pagedItems,
	columns,
	fixedFilter,
	usingFilters,
	selection,
}: PagedItemsTableProps<T>) {
	const dispatch = useAppDispatch()

	const { items, sortBy } = pagedItems
	const [dataObjects, setDataObjects] = useState<T[]>([])

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
				const objects = await getDataObjectsByID(ids)
				setDataObjects(objects)
			} catch (error) {
				// TODO set an error in the paged items state
			}
		}
		retrieveItems([...items])
	}, [getDataObjectsByID, items])

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

	// TODO : Find a way to make selection generic
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

	return (
		<>
			{columns && (
				<>
					{usingFilters && pagedItems.filters && (
						<FiltersBar filters={pagedItems.filters} clearFilters={clearFiltersCallback}></FiltersBar>
					)}
					<Table
						rowSelection={rowSelection}
						dataSource={dataObjects}
						columns={columns}
						rowKey={(obj) => obj.id ?? 'BAD_SAMPLE_KEY'} // The data objects passed to the table must have an id property
						style={{ overflowX: 'auto' }}
						onChange={sortByCallback}
						pagination={false}
					/>
					{true && (
						<Pagination
							className="ant-table-pagination ant-table-pagination-right"
							showSizeChanger={true}
							showQuickJumper={true}
							showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
							current={pagedItems.page?.pageNumber}
							pageSize={pagedItems.page?.limit}
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
