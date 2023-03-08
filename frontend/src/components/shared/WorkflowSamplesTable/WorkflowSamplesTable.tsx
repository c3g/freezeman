import { Table } from 'antd'
import { RowSelectMethod, TableRowSelection } from 'antd/lib/table/interface'
import { filter } from 'rambda'
import React, { useEffect, useState } from 'react'
import { useAppSelector } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { Sample } from '../../../models/frontend_models'
import { FilterDescriptionSet, FilterKeySet, FilterSet, SetFilterFunc, SetFilterOptionFunc } from '../../../models/paged_items'
import { selectLibrariesByID, selectSamplesByID } from '../../../selectors'
import { SampleAndLibrary } from './ColumnSets'
import { mergeColumnsAndFilters } from './MergeColumnsAndFilters'
import { IdentifiedTableColumnType } from './SampleTableColumns'



interface WorkflowSamplesTableProps {
	sampleIDs: FMSId[]
	columns: IdentifiedTableColumnType<SampleAndLibrary>[],
	filterDefinitions?: FilterDescriptionSet,
	filterKeys?: FilterKeySet,
	filters?: FilterSet,
	setFilter?: SetFilterFunc,
	setFilterOptions?: SetFilterOptionFunc,
	selection?: {
		selectedSampleIDs: FMSId[]
		onSelectionChanged: (selectedSamples: SampleAndLibrary[]) => void
	}
}

// TODO port StudySamples component to use this table.
function WorkflowSamplesTable({sampleIDs, columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions, selection} : WorkflowSamplesTableProps) {
	const [samples, setSamples] = useState<SampleAndLibrary[]>([])
	const [tableColumns, setTableColumns] = useState<IdentifiedTableColumnType<SampleAndLibrary>[]>()

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

	useEffect(() => {
		const mergedColumns = mergeColumnsAndFilters(
			columns, 
			filterDefinitions ?? {},
			filterKeys ?? {},
			filters ?? {}, 
			setFilter ?? (() => {/*noop*/}), 
			setFilterOptions ?? (() => {/*noop*/}))
		setTableColumns(mergedColumns)
	}, [filters])

	// Ideally, we would do this once
	

	let rowSelection: TableRowSelection<SampleAndLibrary> | undefined = undefined
	if(selection) {
		rowSelection = {
			type: 'checkbox',
			onChange: (selectedRowKeys: React.Key[], selectedRows: SampleAndLibrary[], info: {type: RowSelectMethod}) => {
				console.log(selectedRows, info)
				selection.onSelectionChanged(selectedRows)				
			},
			getCheckboxProps: (record: SampleAndLibrary) => ({
				name: `${record.sample?.id}`,
			}),
			selectedRowKeys: [...selection.selectedSampleIDs]
		}
	}
	
	return (
		<>
			{tableColumns && 
				<Table
					rowSelection={rowSelection}
					dataSource={samples ?? []}
					columns={tableColumns}
					rowKey={obj => obj.sample?.id ?? 'BAD_SAMPLE_KEY'}
					style={{overflowX: 'auto'}}
				/>
			}
		</>
	)
}

export default WorkflowSamplesTable

