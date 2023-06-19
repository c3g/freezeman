import { Pagination, Table, TableProps } from 'antd'
import { TableRowSelection } from 'antd/lib/table/interface'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch } from '../../hooks'
import { DataID, FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, FilterSetting, FilterValue, PageableData, PagedItems } from '../../models/paged_items'
import { PagedItemsActions, SetFilterActionType, SetFilterOptionsActionType } from '../../models/paged_items_factory'
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

// This callback function is called whenever the table needs to request a new page
// of data due to pagination.
export type RequestPageCallback = (pageNumber: number) => void

interface PagedItemsTableProps<T extends PageableData> {
	// The paged items table only has a list of item ID's. You have provide a function
	// that maps those ID's to data objects which get rendered by the table.
	getDataObjectsByID: (ids: number[]) => Promise<T[]>	
	pagedItems: PagedItems
	pagedItemsActions: PagedItemsActions

	// When the user uses the pagination controls to change to another page this
	// callback is called to request that a new page is loaded. The caller is responsible
	// for fetching the page of data.
	requestPageCallback: RequestPageCallback

	columns: IdentifiedTableColumnType<T>[]
	fixedFilter?: FilterSetting
	usingFilters: boolean

	selection?: PagedItemTableSelection<T>
}

function PagedItemsTable<T extends PageableData>({
	getDataObjectsByID,
	requestPageCallback,
	pagedItems,
	pagedItemsActions,
	columns,
	fixedFilter,
	usingFilters,
	selection,
}: PagedItemsTableProps<T>) {
	const dispatch = useAppDispatch()

	const { items, sortBy } = pagedItems
	const { setFixedFilter, clearFilters, setSortBy, setPageSize } = pagedItemsActions
	const [dataObjects, setDataObjects] = useState<T[]>([])

	// On initial load, trigger the fetch of one page of items
	useEffect(
		() => {
			if (fixedFilter && fixedFilter.description) {
				dispatch(setFixedFilter(fixedFilter))
			}
			requestPageCallback(pagedItems.page?.pageNumber ?? 1)
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

	// TODO Is there any advantage to wrapping the callback in a callback?
	const listPageCallback = useCallback(
		(pageNumber) => {
			requestPageCallback(pageNumber)
		},
		[requestPageCallback]
	)

	const pageSizeCallback = useCallback(
		(pageSize) => {
			// TODO: It's unclear if limit should be part of the paged items data structure,
			// or if we should ALWAYS use the pageSize stored for the app. Right now, setting
			// the page size changes it for the current table and for the app.
			dispatch(setPageSize(pageSize))
			dispatch(setPageSizeForApp(pageSize))
		},
		[dispatch, setPageSize]
	)

	const clearFiltersCallback = useCallback(() => {
		dispatch(clearFilters())
	}, [dispatch, clearFilters])

	// We use this callback to respond when the user sorts a column
	const setSortByCallback: TableProps<any>['onChange'] = useCallback(
		(pagination, filters, sorterResult) => {
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
		},
		[dispatch, sortBy, setSortBy]
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

/*
	Use cases:

	The list of all items of a given type (samples, projects, etc..)
		- Data can be pulled straight from redux itemsByID
		- Could use a selector pointing to itemsByID

	A list of items of a given type with special filtering (eg. project samples)
		- Data can be pulled straight from redux itemsByID
		- Could use selector pointing to itemsByID

	A list of items that combine two or more types (eg. SampleAndLibrary, SampleAndLibraryAndProcess)
		- There is no redux state holding these objects - they are created on demand.
		- The typed items are each in a separate redux state that must be combined.
		- Avoid copying the items into a new redux state since there will no longer be
			a single source of truth.

	A list of hybrid/synthetic items that combine values from different types or which do not
	have a corresponding database type
		- Table creator is responsible for providing these objects when requested
		- Objects must have an id, because table asks for them by id
*/