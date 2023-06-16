import { Pagination, Table, TableProps } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch } from '../../hooks'
import { DataID, FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, FilterSetting, FilterValue, PageableData, PagedItems } from '../../models/paged_items'
import { PagedItemsActions, SetFilterActionType, SetFilterOptionsActionType } from '../../models/paged_items_factory'
import { setPageSize as setPageSizeForApp } from '../../modules/pagination'
import FiltersBar from '../filters/FiltersBar'
import { addFiltersToColumns } from '../shared/WorkflowSamplesTable/MergeColumnsAndFilters'
import { IdentifiedTableColumnType } from '../shared/WorkflowSamplesTable/SampleTableColumns'
import { TableRowSelection } from 'antd/lib/table/interface'

// TODO move this to its own file
/*  This is a hook that combines column definitions with filter definitions to produce
	complete column descriptions for the table. 
*/
export function useFilteredColumns<T>(
	columns: IdentifiedTableColumnType<T>[],
	filterDefinitions: FilterDescriptionSet,
	filterKeys: FilterKeySet,
	filters: FilterSet,
	setFilter: SetFilterActionType,
	setFilterOptions: SetFilterOptionsActionType
) {
	const dispatch = useAppDispatch()

	const setFilterCallback = useCallback((filterKey: string, value: FilterValue, description: FilterDescription) => {
		dispatch(setFilter(value, description))
	}, [dispatch, setFilter])

	const setFilterOptionsCallback = useCallback(
		(filterKey: string, propertyName: string, value: boolean, description: FilterDescription) => {
			dispatch(setFilterOptions(description, { [propertyName]: value }))
		},
		[dispatch, setFilterOptions]
	)

	const tableColumns = useMemo(() => {
		const mergedColumns = addFiltersToColumns(
			columns,
			filterDefinitions ?? {},
			filterKeys ?? {},
			filters ?? {},
			setFilterCallback,
			setFilterOptionsCallback
		)
		return mergedColumns
	}, [columns, filterDefinitions, filterKeys, filters, setFilterCallback, setFilterOptionsCallback])
	return tableColumns
}


export interface PagedItemTableSelection<T extends PageableData> {
	selectedItemIDs: DataID[]
	onSelectionChanged: (selectedItems: T[]) => void
}

interface PagedItemsTableProps<T extends PageableData> {
	getItemsByID: (ids: number[]) => Promise<T[]>
	pagedItems: PagedItems
	pagedItemsActions: PagedItemsActions

	columns: IdentifiedTableColumnType<T>[]
	fixedFilter?: FilterSetting
	usingFilters: boolean

	selection?: PagedItemTableSelection<T>
}

function PagedItemsTable<T extends PageableData>({getItemsByID, pagedItems, pagedItemsActions, columns, fixedFilter, usingFilters, selection}: PagedItemsTableProps<T>) {

	const dispatch = useAppDispatch()

	const { items, sortBy } = pagedItems
	const { setFixedFilter, clearFilters, listPage, setSortBy, setPageSize } = pagedItemsActions
	const [data, setData] = useState<T[]>([])

	
	// On initial load, trigger the fetch of one page of items
	useEffect(() => {
		if (fixedFilter && fixedFilter.description) {
			dispatch(setFixedFilter(fixedFilter))
		}
		dispatch(listPage(pagedItems.page?.pageNumber ?? 1))
	}, [/* Only call once when the component is mounted*/])

	// 
	useEffect(() => {
		async function retrieveItems(ids: number[]) {
			try {
				const items = await getItemsByID(ids)
				setData(items)
			} catch(error) {
				// TODO set an error in the paged items state
			}
		}
		retrieveItems([...items])
	}, [getItemsByID, items])


	const listPageCallback = useCallback((pageNumber) => {
		dispatch(listPage(pageNumber))
	}, [dispatch, listPage])

	const pageSizeCallback = useCallback(pageSize => {
		dispatch(setPageSize(pageSize))
		dispatch(setPageSizeForApp(pageSize))
	}, [dispatch, setPageSize])

	const clearFiltersCallback = useCallback(() => {
		dispatch(clearFilters())
	}, [dispatch, clearFilters])

	// We use this callback to respond when the user sorts a column
	const setSortByCallback: TableProps<any>['onChange'] = useCallback( (pagination, filters, sorterResult) => {
		if (!Array.isArray(sorterResult)) {
			const sorter = sorterResult
			const key = sorter.columnKey?.toString()
			const order = sorter.order ?? undefined
			if (key) {
				if (sortBy === undefined || key !== sortBy.key || order !== sortBy.order) {
					dispatch(setSortBy({ key, order }))
				}
			}
		}
	}, [dispatch, sortBy, setSortBy])

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
						dataSource={data}
						columns={columns}
						rowKey={(obj) => obj.id ?? 'BAD_SAMPLE_KEY'} // The data objects passed to the table must have an id property
						style={{ overflowX: 'auto' }}
						onChange={setSortByCallback}
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

