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




interface SampleAndLibrary extends ObjectWithSample, ObjectWithLibrary {}

function getColumnsForStep(step: StudySampleStep, protocol: Protocol): ColumnsType<SampleAndLibrary> {

	const DEFAULT_SAMPLE_COLUMNS = [
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

	const QC_SAMPLE_COLUMNS = [
		SAMPLE_COLUMNS.ID,
		SAMPLE_COLUMNS.KIND,
		SAMPLE_COLUMNS.NAME,
		SAMPLE_COLUMNS.INDIVIDUAL,
		SAMPLE_COLUMNS.CONTAINER_NAME,
		SAMPLE_COLUMNS.CONTAINER_BARCODE,
		SAMPLE_COLUMNS.COORDINATES,
		SAMPLE_COLUMNS.VOLUME,
		SAMPLE_COLUMNS.QC_FLAG,			// * post QC 
		SAMPLE_COLUMNS.CREATION_DATE,
		SAMPLE_COLUMNS.DEPLETED
	]

	const DEFAULT_LIBRARY_COLUMNS = [
		LIBRARY_COLUMNS.ID,
		LIBRARY_COLUMNS.PLATFORM,
		LIBRARY_COLUMNS.NAME,
		LIBRARY_COLUMNS.CONTAINER_BARCODE,
		LIBRARY_COLUMNS.COORDINATES,
		LIBRARY_COLUMNS.LIBRARY_TYPE,
		LIBRARY_COLUMNS.SELECTION_TARGET,
		LIBRARY_COLUMNS.INDEX,
		LIBRARY_COLUMNS.VOLUME,
		LIBRARY_COLUMNS.LIBRARY_SIZE,
		LIBRARY_COLUMNS.CONCENTRATION,
		LIBRARY_COLUMNS.NA_QUANTITY,
		LIBRARY_COLUMNS.CREATION_DATE,
		LIBRARY_COLUMNS.DEPLETED,
	]

	const QC_LIBRARY_COLUMNS = [
		LIBRARY_COLUMNS.ID,
		LIBRARY_COLUMNS.PLATFORM,
		LIBRARY_COLUMNS.NAME,
		LIBRARY_COLUMNS.CONTAINER_BARCODE,
		LIBRARY_COLUMNS.COORDINATES,
		LIBRARY_COLUMNS.LIBRARY_TYPE,
		LIBRARY_COLUMNS.SELECTION_TARGET,
		LIBRARY_COLUMNS.INDEX,
		LIBRARY_COLUMNS.VOLUME,
		LIBRARY_COLUMNS.LIBRARY_SIZE,
		LIBRARY_COLUMNS.CONCENTRATION,
		LIBRARY_COLUMNS.NA_QUANTITY,
		LIBRARY_COLUMNS.QC_FLAG,
		LIBRARY_COLUMNS.CREATION_DATE,
		LIBRARY_COLUMNS.DEPLETED,
	]

	switch(protocol.name) {
		case ProtocolNames.Extraction: {
			return DEFAULT_SAMPLE_COLUMNS
		}
		case ProtocolNames.Sample_Quality_Control: {
			return DEFAULT_SAMPLE_COLUMNS
		}
		case ProtocolNames.Sample_Pooling: {
			return QC_SAMPLE_COLUMNS
		}
		case ProtocolNames.Library_Preparation: {
			return QC_SAMPLE_COLUMNS
		}
		case ProtocolNames.Library_Quality_Control: {
			return DEFAULT_LIBRARY_COLUMNS
		}
		case ProtocolNames.Library_Capture: {
			return QC_LIBRARY_COLUMNS
		}
		case ProtocolNames.Library_Conversion: {
			return QC_LIBRARY_COLUMNS
		}
		case ProtocolNames.Normalization: {
			// TODO Use step specification to distinguish sample vs. library
			if (step.stepName.includes('(Library)')) {
				return QC_LIBRARY_COLUMNS
			} else {
				return QC_SAMPLE_COLUMNS
			}
		}
		case ProtocolNames.DNBSEQ_Preparation: {
			return QC_LIBRARY_COLUMNS
		}
		case ProtocolNames.Illumina_Preparation: {
			return QC_LIBRARY_COLUMNS
		}
		default:
			return DEFAULT_SAMPLE_COLUMNS
	}
}

interface StudyStepSamplesTableProps {
	step: StudySampleStep
}

function StudyStepSamplesTable({step} : StudyStepSamplesTableProps) {

	const [samples, setSamples] = useState<SampleAndLibrary[]>()

	const samplesByID = useAppSelector(selectSamplesByID)
	const librariesByID = useAppSelector(selectLibrariesByID)
	const protocolsByID = useAppSelector(selectProtocolsByID)

	const protocol : Protocol | undefined = protocolsByID[step.protocolID]
	if(!protocol) {
		return null
	}

	const columns = getColumnsForStep(step, protocol)

	useEffect(() => {
		const availableSamples = step.samples.reduce((acc, sampleID) => {
			const sample = samplesByID[sampleID]
			if (sample.is_library) {
				const library = librariesByID[sampleID]
				acc.push({sample, library})
			} else {
				acc.push({sample})
			}
			return acc
		}, [] as SampleAndLibrary[])

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

