import { Pagination, Table, TableProps } from 'antd'
import { TableRowSelection } from 'antd/lib/table/interface'
import React, { useMemo } from 'react'
import { FMSId } from '../../models/fms_api_models'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterOptions, FilterSet, FilterSetting, FilterValue, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../models/paged_items'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import { IdentifiedTableColumnType } from '../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibrary } from './ColumnSets'
import { addFiltersToColumns } from '../pagedItemsTable/MergeColumnsAndFilters'
import PagedItemsTable, { DataObjectsByID } from '../pagedItemsTable/PagedItemsTable'


export interface PaginationParameters {
	pageNumber: number
	pageSize: number
	totalCount: number
	onChangePageNumber: (pageNumber: number) => void
	onChangePageSize: (newPageSize: number) => void
}

export interface WorkflowSamplesTableProps {
	samples: SampleAndLibrary[]
	columns: IdentifiedTableColumnType<SampleAndLibrary>[]
	hasFilter: boolean,
	clearFilters?: () => void,
	filterDefinitions?: FilterDescriptionSet,
	filterKeys?: FilterKeySet,
	filters?: FilterSet,
	setFilter?: SetFilterFunc,
	setFilterOptions?: SetFilterOptionFunc,
	sortBy?: SortBy,
	setSortBy?: SetSortByFunc,
	pagination?: PaginationParameters,
	selection?: {
		selectedSampleIDs: FMSId[],
		onSelectionChanged: (selectedSamples: SampleAndLibrary[]) => void
	}
	loading?: boolean
}

function WorkflowSamplesTable({ samples, columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions, sortBy, setSortBy, pagination, selection, hasFilter, clearFilters, loading }: WorkflowSamplesTableProps) {

	const tableColumns = useMemo(() => {
		const mergedColumns = addFiltersToColumns(
			columns,
			filterDefinitions ?? {},
			filterKeys ?? {},
			filters ?? {},
			setFilter,
			setFilterOptions)
		return mergedColumns
	}, [columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions])



	let rowSelection: TableRowSelection<SampleAndLibrary> | undefined = undefined
	if (selection) {
		rowSelection = {
			type: 'checkbox',
			onChange: (selectedRowKeys: React.Key[], selectedRows: SampleAndLibrary[]) => {
				selection.onSelectionChanged(selectedRows)
			},
			selectedRowKeys: [...selection.selectedSampleIDs]
		}
	}

	const handleTableOnChange: TableProps<any>['onChange'] = (pagination, filters, sorterResult) => {
		if (setSortBy) {
			if (!Array.isArray(sorterResult)) {
				const sorter = sorterResult
				const key = sorter.columnKey?.toString()
				const order = sorter.order ?? undefined
				if (key) {
					if (sortBy === undefined || key !== sortBy.key || order !== sortBy.order) {
						setSortBy({ key, order })
					}
				}
			}
		}
	}

	return <PagedItemsTable
		getDataObjectsByID={function (ids: number[]): Promise<DataObjectsByID<object>> {
			throw new Error('Function not implemented.')
		} }
		pagedItems={undefined}
		usingFilters={false}
		listPageCallback={function (pagedNumber: number): void {
			throw new Error('Function not implemented.')
		} }
		setFixedFilterCallback={function (filter: FilterSetting): void {
			throw new Error('Function not implemented.')
		} }
		setFilterCallback={function (value: FilterValue, description: FilterDescription): void {
			throw new Error('Function not implemented.')
		} }
		setFilterOptionsCallback={function (description: FilterDescription, options: FilterOptions): void {
			throw new Error('Function not implemented.')
		} }
		clearFiltersCallback={function (): void {
			throw new Error('Function not implemented.')
		} }
		setSortByCallback={function (sortBy: SortBy): void {
			throw new Error('Function not implemented.')
		} }
		setPageSizeCallback={function (pageSize: number): void {
			throw new Error('Function not implemented.')
		} }
		resetPagedItemsCallback={function (): void {
			throw new Error('Function not implemented.')
		} }
		setStaleCallback={function (stale: boolean): void {
			throw new Error('Function not implemented.')
		} }
		refreshPageCallback={function (): void {
			throw new Error('Function not implemented.')
		} }
	/>
}

export default WorkflowSamplesTable

