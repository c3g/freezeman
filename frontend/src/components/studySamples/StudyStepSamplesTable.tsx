import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useAppSelector } from '../../hooks'
import { Protocol } from '../../models/frontend_models'
import { ProtocolNames } from '../../models/protocols'
import { StudySampleStep } from '../../models/study_samples'
import { selectLibrariesByID, selectProtocolsByID, selectSamplesByID } from '../../selectors'
import LIBRARY_COLUMNS, { ObjectWithLibrary } from './LibraryTableColumns'
import SAMPLE_COLUMNS, { ObjectWithSample } from './SampleTableColumns'

interface SampleAndLibrary extends ObjectWithSample, ObjectWithLibrary {}

function getColumnsForStep(step: StudySampleStep, protocol: Protocol): ColumnsType<SampleAndLibrary> {

	const DEFAULT_SAMPLE_COLUMNS = [
		SAMPLE_COLUMNS.ID,
		SAMPLE_COLUMNS.KIND,
		SAMPLE_COLUMNS.NAME,
		SAMPLE_COLUMNS.CONTAINER_BARCODE,
		SAMPLE_COLUMNS.COORDINATES,
		SAMPLE_COLUMNS.VOLUME,
		SAMPLE_COLUMNS.CONCENTRATION,
		SAMPLE_COLUMNS.QC_FLAG,
		SAMPLE_COLUMNS.CREATION_DATE,
		SAMPLE_COLUMNS.DEPLETED
	]

	const PRE_QC_SAMPLE_COLUMNS = [
		SAMPLE_COLUMNS.ID,
		SAMPLE_COLUMNS.KIND,
		SAMPLE_COLUMNS.NAME,
		SAMPLE_COLUMNS.CONTAINER_BARCODE,
		SAMPLE_COLUMNS.COORDINATES,
		SAMPLE_COLUMNS.VOLUME,
		SAMPLE_COLUMNS.CONCENTRATION,
		SAMPLE_COLUMNS.CREATION_DATE,
		SAMPLE_COLUMNS.DEPLETED
	]

	const DEFAULT_LIBRARY_COLUMNS = [
		LIBRARY_COLUMNS.ID,
		LIBRARY_COLUMNS.LIBRARY_TYPE,
		LIBRARY_COLUMNS.NAME,
		LIBRARY_COLUMNS.CONTAINER_BARCODE,
		LIBRARY_COLUMNS.COORDINATES,		
		LIBRARY_COLUMNS.INDEX,
		LIBRARY_COLUMNS.VOLUME,
		LIBRARY_COLUMNS.CONCENTRATION,
		LIBRARY_COLUMNS.QC_FLAG,
		LIBRARY_COLUMNS.CREATION_DATE,
		LIBRARY_COLUMNS.DEPLETED,
	]

	const PRE_QC_LIBRARY_COLUMNS = [
		LIBRARY_COLUMNS.ID,
		LIBRARY_COLUMNS.LIBRARY_TYPE,
		LIBRARY_COLUMNS.NAME,
		LIBRARY_COLUMNS.CONTAINER_BARCODE,
		LIBRARY_COLUMNS.COORDINATES,		
		LIBRARY_COLUMNS.INDEX,
		LIBRARY_COLUMNS.VOLUME,
		LIBRARY_COLUMNS.CONCENTRATION,
		LIBRARY_COLUMNS.CREATION_DATE,
		LIBRARY_COLUMNS.DEPLETED,
	]

	const EXPERIMENT_COLUMNS = [
		LIBRARY_COLUMNS.ID,
		LIBRARY_COLUMNS.NAME,
		LIBRARY_COLUMNS.CONTAINER_BARCODE,
		LIBRARY_COLUMNS.COORDINATES,
		LIBRARY_COLUMNS.VOLUME,
		LIBRARY_COLUMNS.QC_FLAG,
		LIBRARY_COLUMNS.CREATION_DATE,
		LIBRARY_COLUMNS.DEPLETED
	]

	switch(protocol.name) {
		case ProtocolNames.Extraction: {
			return PRE_QC_SAMPLE_COLUMNS
		}
		case ProtocolNames.Sample_Quality_Control: {
			return PRE_QC_SAMPLE_COLUMNS
		}
		case ProtocolNames.Sample_Pooling: {
			return DEFAULT_SAMPLE_COLUMNS
		}
		case ProtocolNames.Library_Preparation: {
			return DEFAULT_SAMPLE_COLUMNS
		}
		case ProtocolNames.Library_Quality_Control: {
			return PRE_QC_LIBRARY_COLUMNS
		}
		case ProtocolNames.Library_Capture: {
			return DEFAULT_LIBRARY_COLUMNS
		}
		case ProtocolNames.Library_Conversion: {
			return DEFAULT_LIBRARY_COLUMNS
		}
		case ProtocolNames.Normalization: {
			// TODO Use step specification to distinguish sample vs. library
			if (step.stepName.includes('(Library)')) {
				return DEFAULT_LIBRARY_COLUMNS
			} else {
				return DEFAULT_SAMPLE_COLUMNS
			}
		}
		case ProtocolNames.DNBSEQ_Preparation: {
			return EXPERIMENT_COLUMNS
		}
		case ProtocolNames.Illumina_Preparation: {
			return EXPERIMENT_COLUMNS
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
			style={{overflowX: 'auto'}}
		/>
	)
}

export default StudyStepSamplesTable

