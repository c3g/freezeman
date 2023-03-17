import { Pagination, Table, TableProps } from 'antd'
import { TableRowSelection } from 'antd/lib/table/interface'
import React, { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { FilterDescriptionSet, FilterKeySet, FilterSet, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../../models/paged_items'
import { selectLibrariesByID, selectSamplesByID } from '../../../selectors'
import { SampleAndLibrary } from './ColumnSets'
import { addFiltersToColumns } from './MergeColumnsAndFilters'
import { IdentifiedTableColumnType } from './SampleTableColumns'

export interface PaginationParameters {
	pageNumber: number
	pageSize: number
	totalCount: number
	onChangePageNumber: (pageNumber : number) => void
	onChangePageSize: (newPageSize: number) => void
}

interface WorkflowSamplesTableProps {
	sampleIDs: FMSId[]
	columns: IdentifiedTableColumnType<SampleAndLibrary>[]
	filterDefinitions?: FilterDescriptionSet
	filterKeys?: FilterKeySet
	filters?: FilterSet
	setFilter?: SetFilterFunc
	setFilterOptions?: SetFilterOptionFunc
	sortBy?: SortBy
	setSortBy?: SetSortByFunc
	pagination?: PaginationParameters
	selection?: {
		selectedSampleIDs: FMSId[]
		onSelectionChanged: (selectedSamples: SampleAndLibrary[]) => void
	}
}

function WorkflowSamplesTable({sampleIDs, columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions, sortBy, setSortBy, pagination, selection} : WorkflowSamplesTableProps) {
	const [samples, setSamples] = useState<SampleAndLibrary[]>([])
	const samplesByID = useAppSelector(selectSamplesByID)
	const librariesByID = useAppSelector(selectLibrariesByID)

	useEffect(() => {
		const availableSamples = sampleIDs.reduce((acc, sampleID) => {
			const sample = samplesByID[sampleID]
			if (sample) {
				if (sample.is_library) {
					const library = librariesByID[sampleID]
					acc.push({sample, library})
				} else {
					acc.push({sample})
				}
			}
			return acc
		}, [] as SampleAndLibrary[])

		setSamples(availableSamples)
	}, [samplesByID, librariesByID, sampleIDs])


	const tableColumns = useMemo(() => {
		const mergedColumns = addFiltersToColumns(
			columns, 
			filterDefinitions ?? {},
			filterKeys ?? {},
			filters ?? {}, 
			setFilter, 
			setFilterOptions)
		return mergedColumns
	}, [filterDefinitions, filterKeys, filters])


	let rowSelection: TableRowSelection<SampleAndLibrary> | undefined = undefined
	if(selection) {
		rowSelection = {
			type: 'checkbox',
			onChange: (selectedRowKeys: React.Key[], selectedRows: SampleAndLibrary[]) => {
				selection.onSelectionChanged(selectedRows)				
			},
			getCheckboxProps: (record: SampleAndLibrary) => ({
				name: `${record.sample?.id}`,
			}),
			selectedRowKeys: [...selection.selectedSampleIDs]
		}
	}

	const handleTableOnChange: TableProps<any>['onChange'] = (pagination, filters, sorterResult) => {
		if( setSortBy) {
			if(! Array.isArray(sorterResult)) {
				const sorter = sorterResult
				const key = sorter.columnKey?.toString()
				const order = sorter.order ?? undefined
				if (key) {
					if (sortBy === undefined || key !== sortBy.key || order !== sortBy.order) {
						setSortBy({key, order})
					}
				}
			}
		}
	}
	
	return (
		<>
			{tableColumns && 
				<>
					<Table
						rowSelection={rowSelection}
						dataSource={samples ?? []}
						columns={tableColumns}
						rowKey={obj => obj.sample?.id ?? 'BAD_SAMPLE_KEY'}
						style={{overflowX: 'auto'}}
						onChange={handleTableOnChange}
						pagination={pagination ? false : undefined}
					/>
					{ pagination && 
						<Pagination
							className="ant-table-pagination ant-table-pagination-right"
							showSizeChanger={true}
							showQuickJumper={true}
							showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
							current={pagination.pageNumber}
							pageSize={pagination.pageSize}
							total={pagination.totalCount}
							onChange={(pageNumber) => pagination.onChangePageNumber(pageNumber)}
							onShowSizeChange={(current, newPageSize) => pagination.onChangePageSize(newPageSize)}
						/>
					}
				</>
			}
		</>
	)
}

export default WorkflowSamplesTable

