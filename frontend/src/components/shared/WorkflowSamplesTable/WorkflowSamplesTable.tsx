import { Table, TableColumnsType } from 'antd'
import React, { useEffect, useState } from 'react'
import { useAppSelector } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { selectLibrariesByID, selectSamplesByID } from '../../../selectors'
import { SampleAndLibrary } from './ColumnSets'



interface WorkflowSamplesTableProps {
	sampleIDs: FMSId[]
	columns: TableColumnsType<SampleAndLibrary>
}

// TODO port StudySamples component to use this table.
function WorkflowSamplesTable({sampleIDs, columns} : WorkflowSamplesTableProps) {

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
	
	return (
		<Table
			dataSource={samples ?? []}
			columns={columns}
			rowKey={obj => obj.sample!.id}
			style={{overflowX: 'auto'}}
		/>
	)
}

export default WorkflowSamplesTable

