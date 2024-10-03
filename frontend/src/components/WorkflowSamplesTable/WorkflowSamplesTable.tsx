import { Pagination, Table, TableProps } from 'antd'
import { TableRowSelection } from 'antd/lib/table/interface'
import React, { useMemo } from 'react'
import { FMSId } from '../../models/fms_api_models'
import { FilterDescriptionSet, FilterKeySet, FilterSet, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../models/paged_items'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import { IdentifiedTableColumnType } from '../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibrary } from './ColumnSets'
import { addFiltersToColumns } from '../pagedItemsTable/MergeColumnsAndFilters'
import CSS from "csstype";


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
    const stickyTableBottom: CSS.Properties = {
      position: 'sticky',
      insetBlockEnd: '0px',
      backgroundColor: 'white',
      display: 'flow-root',
      paddingRight: '10px',
      borderRadius: '2px',
      borderTop: '1px solid darkgray'
  };

	return (
		<>
			{tableColumns &&
				<>
					{
						hasFilter && clearFilters && filters &&
						<FiltersBar filters={filters} clearFilters={clearFilters}></FiltersBar>
					}
					<Table
						rowSelection={rowSelection}
						dataSource={samples ?? []}
						columns={tableColumns}
						rowKey={obj => obj.sample?.id ?? 'BAD_SAMPLE_KEY'}
						style={{ overflowX: 'auto' }}
						onChange={handleTableOnChange}
						pagination={pagination ? false : undefined}
						loading={loading}
					/>
					{pagination &&
          <div className="table-bottom">
            <Pagination
							className="ant-table-pagination ant-table-pagination-right"
							showSizeChanger={true}
							showQuickJumper={true}
							showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
							current={pagination.pageNumber}
							pageSize={pagination.pageSize}
							total={pagination.totalCount}
							onChange={(pageNumber, pageSize) => {
								if (pagination.pageSize !== pageSize) {
									pagination.onChangePageNumber(1)
								} else {
									pagination.onChangePageNumber(pageNumber)
								}
							}}
							onShowSizeChange={(current, newPageSize) => pagination.onChangePageSize(newPageSize)}
						/>
          </div>
					}
				</>
			}
		</>
	)
}

export default WorkflowSamplesTable

