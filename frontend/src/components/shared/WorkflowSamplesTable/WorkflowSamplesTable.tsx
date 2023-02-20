import { Table, TableColumnsType, TableColumnType } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useAppSelector } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { Protocol } from '../../../models/frontend_models'
import { ProtocolNames } from '../../../models/protocols'
import { StudySampleStep } from '../../../models/study_samples'
import { selectLibrariesByID, selectProtocolsByID, selectSamplesByID } from '../../../selectors'
import LIBRARY_COLUMNS, { ObjectWithLibrary } from './LibraryTableColumns'
import SAMPLE_COLUMNS, { ObjectWithSample } from './SampleTableColumns'

interface SampleAndLibrary extends ObjectWithSample, ObjectWithLibrary {}

function getColumnsForStep(stepName: string, protocol: Protocol): TableColumnsType<SampleAndLibrary> {

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
			if (stepName.includes('(Library)')) {
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

interface WorkflowSamplesTableProps {
	sampleIDs: FMSId[]
	stepName: string
	protocol: Protocol
	prefixColumn?: TableColumnType<any>		// This allow us to insert a custom column as the firt column in the table - used for selection checkboxes.
}

// TODO port StudySamples component to use this table.
function WorkflowSamplesTable({sampleIDs, stepName, protocol, prefixColumn} : WorkflowSamplesTableProps) {

	const [samples, setSamples] = useState<SampleAndLibrary[]>([])

	const samplesByID = useAppSelector(selectSamplesByID)
	const librariesByID = useAppSelector(selectLibrariesByID)

	const columns = getColumnsForStep(stepName, protocol)
	if (prefixColumn) {
		columns.unshift(prefixColumn)
	}

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

