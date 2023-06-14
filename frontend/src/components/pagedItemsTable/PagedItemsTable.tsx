import { Pagination, Table, TableProps } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useAppDispatch } from '../../hooks'
import { FMSTrackedModel } from '../../models/fms_api_models'
import { FilterDescriptionSet, FilterKeySet, FilterSet, PagedItems, SetFilterFunc, SetFilterOptionFunc } from '../../models/paged_items'
import { setPageSize as setPageSizeForApp } from '../../modules/pagination'
import { PagedItemsActions } from '../../utils/paged_items_factory'
import FiltersBar from '../filters/FiltersBar'
import { addFiltersToColumns } from '../shared/WorkflowSamplesTable/MergeColumnsAndFilters'
import { IdentifiedTableColumnType } from '../shared/WorkflowSamplesTable/SampleTableColumns'
import { ItemsByID } from '../../models/frontend_models'


/*  This is a hook that combines column definitions with filter definitions to produce
	complete column descriptions for the table. */
function useFilteredColumns<T>(
	columns: IdentifiedTableColumnType<T>[],
	filterDefinitions: FilterDescriptionSet,
	filterKeys: FilterKeySet,
	filters: FilterSet,
	setFilter?: SetFilterFunc,
	setFilterOptions?: SetFilterOptionFunc
) {
	const tableColumns = useMemo(() => {
		const mergedColumns = addFiltersToColumns(
			columns,
			filterDefinitions ?? {},
			filterKeys ?? {},
			filters ?? {},
			setFilter,
			setFilterOptions
		)
		return mergedColumns
	}, [columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions])
	return tableColumns
}

interface PagedItemsTableProps<T extends FMSTrackedModel> {
	itemsByID: ItemsByID<T>
	pagedItems: PagedItems<T>
	pagedItemsActions: PagedItemsActions

	columns: IdentifiedTableColumnType<T>[]
	usingFilters: boolean

	// selection?: {
	// 	selectedItemIDs: FMSId[]
	// 	onSelectionChanged: (selectedItems: T[]) => void
	// }
}

function PagedItemsTable<T extends FMSTrackedModel>({itemsByID, pagedItems, pagedItemsActions, columns, usingFilters}: PagedItemsTableProps<T>) {

	const dispatch = useAppDispatch()

	const { sortBy } = pagedItems
	const { clearFilters, listPage, setSortBy, setPageSize } = pagedItemsActions
	
	const handleTableOnChange: TableProps<any>['onChange'] = (pagination, filters, sorterResult) => {
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
	}

	const handlePageNumber = useCallback((pageNumber) => {
		dispatch(listPage(pageNumber))
	}, [dispatch, listPage])

	const handlePageSize = useCallback(pageSize => {
		dispatch(setPageSize(pageSize))
		dispatch(setPageSizeForApp(pageSize))
	}, [dispatch])

	const data = pagedItems.items.reduce((acc, id) => {
		const item = itemsByID[id]
		if (item) {
			acc.push(item)
		}
		return acc
	}, [] as T[])

	// TODO : Find a way to make selection generic
	// let rowSelection: TableRowSelection<T> | undefined = undefined
	// if (selection) {
	// 	rowSelection = {
	// 		type: 'checkbox',
	// 		onChange: (selectedRowKeys: React.Key[], selectedRows: T[]) => {
	// 			selection.onSelectionChanged(selectedRows)
	// 		},
	// 		getCheckboxProps: (record: T) => ({
	// 			name: `${record.sample?.id}`,
	// 		}),
	// 		selectedRowKeys: [...selection.selectedItemIDs],
	// 	}
	// }

	return (
		<>
			{columns && (
				<>
					{usingFilters && pagedItems.filters && <FiltersBar filters={pagedItems.filters} clearFilters={clearFilters}></FiltersBar>}
					<Table
						// rowSelection={rowSelection}
						dataSource={data}
						columns={columns}
						rowKey={(obj) => obj.id ?? 'BAD_SAMPLE_KEY'}	// The data objects passed to the table must have an id property
						style={{ overflowX: 'auto' }}
						onChange={handleTableOnChange}
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
							onChange={handlePageNumber}
							onShowSizeChange={(current, newPageSize) => handlePageSize(newPageSize)}
						/>
					)}
				</>
			)}
		</>
	)
}

