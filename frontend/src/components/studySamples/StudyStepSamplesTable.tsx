import { Table, TableColumnType } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '../../hooks'
import { ItemsByID, Library, Protocol, Sample } from '../../models/frontend_models'
import { StudySampleStep } from '../../models/study_samples'
import { selectLibrariesByID, selectProtocolsByID, selectSamplesByID } from '../../selectors'
import { withSample } from '../../utils/withItem'
import { ProtocolNames } from '../../models/protocols'


import SAMPLE_COLUMNS, { ObjectWithSample } from './SampleTableColumns'
import LIBRARY_COLUMNS, { ObjectWithLibrary } from './LibraryTableColumns'


interface StudyStepSamplesTableProps {
	step: StudySampleStep
}

type DataSourceType = {sampleID: number}


function getColumnsForProtocol(protocolName: string): ColumnsType<ObjectWithSample> {
	switch(protocolName) {
		case ProtocolNames.Extraction: {
			return [
				SAMPLE_COLUMNS.ID,
				SAMPLE_COLUMNS.KIND,
				SAMPLE_COLUMNS.NAME,
				SAMPLE_COLUMNS.INDIVIDUAL,
				SAMPLE_COLUMNS.CONTAINER_NAME,
				SAMPLE_COLUMNS.CONTAINER_BARCODE,
				SAMPLE_COLUMNS.COORDINATES,
				SAMPLE_COLUMNS.VOLUME,
				SAMPLE_COLUMNS.CREATION_DATE,
				SAMPLE_COLUMNS.DEPLETED
			]
		}
		case ProtocolNames.Library_Quality_Control: {
			return [

			]
		}
		default:
			return [
				SAMPLE_COLUMNS.ID,
				SAMPLE_COLUMNS.KIND,
				SAMPLE_COLUMNS.NAME,
				SAMPLE_COLUMNS.INDIVIDUAL,
				SAMPLE_COLUMNS.CONTAINER_NAME,
				SAMPLE_COLUMNS.CONTAINER_BARCODE,
				SAMPLE_COLUMNS.COORDINATES,
				SAMPLE_COLUMNS.VOLUME,
				SAMPLE_COLUMNS.CREATION_DATE,
				SAMPLE_COLUMNS.DEPLETED
			]
	}
}


function StudyStepSamplesTable({step} : StudyStepSamplesTableProps) {

	const [samples, setSamples] = useState<ObjectWithSample[]>()

	const samplesByID = useAppSelector(selectSamplesByID)
	const librariesByID = useAppSelector(selectLibrariesByID)
	const protocolsByID = useAppSelector(selectProtocolsByID)

	const protocol : Protocol | undefined = protocolsByID[step.protocolID]
	const columns = getColumnsForProtocol(protocol?.name ?? '')

	useEffect(() => {
		const availableSamples = step.samples.reduce((acc, sampleID) => {
			const sample = samplesByID[sampleID]
			const library = librariesByID[sampleID]
			if (sample) {
				acc.push({sample})
			}
			return acc
		}, [] as ObjectWithSample[])

		setSamples(availableSamples)
	}, [samplesByID])

	
	return (
		<Table
			dataSource={samples ?? []}
			columns={columns}
			rowKey={obj => obj.sample!.id}
		/>
	)
}

export default StudyStepSamplesTable

