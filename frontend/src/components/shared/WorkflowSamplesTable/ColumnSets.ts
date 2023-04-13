import { Protocol, Step } from '../../../models/frontend_models'
import { ProtocolNames } from '../../../models/protocols'
import { getStepSpecificationValue } from '../../../modules/steps/services'
import { LibraryColumn, LIBRARY_COLUMN_DEFINITIONS as LIBRARY_COLUMNS, ObjectWithLibrary } from './LibraryTableColumns'
import { IdentifiedTableColumnType, ObjectWithSample, SampleColumn, SampleColumnID, SAMPLE_COLUMN_DEFINITIONS as SAMPLE_COLUMNS } from './SampleTableColumns'

export interface SampleAndLibrary extends ObjectWithSample, ObjectWithLibrary {}


export function getColumnsForStudySamplesStep(step: Step, protocol: Protocol) {
	return getColumnsForStep(step, protocol).filter(column => column.columnID !== SampleColumnID.PROJECT)
}

/*
	Returns the default set of columns that should be used to display samples/libraries
	for a given protocol and step.
*/
export function getColumnsForStep(step: Step, protocol: Protocol): IdentifiedTableColumnType<SampleAndLibrary>[] {

	const DEFAULT_SAMPLE_COLUMNS = [
		SAMPLE_COLUMNS.ID,
		SAMPLE_COLUMNS.KIND,
		SAMPLE_COLUMNS.NAME,
		SAMPLE_COLUMNS.PROJECT,
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
		SAMPLE_COLUMNS.PROJECT,
		SAMPLE_COLUMNS.CONTAINER_BARCODE,
		SAMPLE_COLUMNS.COORDINATES,
		SAMPLE_COLUMNS.VOLUME,
		SAMPLE_COLUMNS.CONCENTRATION,
		SAMPLE_COLUMNS.CREATION_DATE,
		SAMPLE_COLUMNS.DEPLETED
	]

	const DEFAULT_LIBRARY_COLUMNS = [
		SAMPLE_COLUMNS.ID,
		LIBRARY_COLUMNS.LIBRARY_TYPE,
		SAMPLE_COLUMNS.NAME,
		SAMPLE_COLUMNS.PROJECT,
		SAMPLE_COLUMNS.CONTAINER_BARCODE,
		SAMPLE_COLUMNS.COORDINATES,		
		LIBRARY_COLUMNS.INDEX_NAME,
		SAMPLE_COLUMNS.VOLUME,
		SAMPLE_COLUMNS.CONCENTRATION,
		LIBRARY_COLUMNS.NA_QUANTITY,
		SAMPLE_COLUMNS.QC_FLAG,
		SAMPLE_COLUMNS.CREATION_DATE,
		SAMPLE_COLUMNS.DEPLETED,
	]

	const PRE_QC_LIBRARY_COLUMNS = [
		SAMPLE_COLUMNS.ID,
		LIBRARY_COLUMNS.LIBRARY_TYPE,
		SAMPLE_COLUMNS.NAME,
		SAMPLE_COLUMNS.PROJECT,
		SAMPLE_COLUMNS.CONTAINER_BARCODE,
		SAMPLE_COLUMNS.COORDINATES,		
		LIBRARY_COLUMNS.INDEX_NAME,
		SAMPLE_COLUMNS.VOLUME,
		SAMPLE_COLUMNS.CREATION_DATE,
		SAMPLE_COLUMNS.DEPLETED,
	]

	const EXPERIMENT_COLUMNS = [
		SAMPLE_COLUMNS.ID,
		SAMPLE_COLUMNS.NAME,
		SAMPLE_COLUMNS.PROJECT,
		SAMPLE_COLUMNS.CONTAINER_BARCODE,
		SAMPLE_COLUMNS.COORDINATES,
		SAMPLE_COLUMNS.VOLUME,
		SAMPLE_COLUMNS.QC_FLAG,
		SAMPLE_COLUMNS.CREATION_DATE,
		SAMPLE_COLUMNS.DEPLETED
	]

	let columnsForStep: (SampleColumn | LibraryColumn)[] = DEFAULT_SAMPLE_COLUMNS

	switch(protocol.name) {
		case ProtocolNames.Extraction: {
			columnsForStep = PRE_QC_SAMPLE_COLUMNS
			break
		}
		case ProtocolNames.Sample_Quality_Control: {
			columnsForStep = PRE_QC_SAMPLE_COLUMNS
			break
		}
		case ProtocolNames.Sample_Pooling: {
			columnsForStep = DEFAULT_SAMPLE_COLUMNS
			break
		}
		case ProtocolNames.Library_Preparation: {
			columnsForStep = DEFAULT_SAMPLE_COLUMNS
			break
		}
    case ProtocolNames.Transfer: {
      columnsForStep = PRE_QC_LIBRARY_COLUMNS
			break
    }
		case ProtocolNames.Library_Quality_Control: {
			columnsForStep = PRE_QC_LIBRARY_COLUMNS
			break
		}
		case ProtocolNames.Library_Capture: {
			columnsForStep = DEFAULT_LIBRARY_COLUMNS
			break
		}
		case ProtocolNames.Library_Conversion: {
			columnsForStep = DEFAULT_LIBRARY_COLUMNS
			break
		}
		case ProtocolNames.Normalization: {
			const type = getStepSpecificationValue(step, 'Normalization Type')
			if (type === 'Library') {
				columnsForStep = DEFAULT_LIBRARY_COLUMNS
			} else {
				columnsForStep = DEFAULT_SAMPLE_COLUMNS
			}
			break
		}
		case ProtocolNames.DNBSEQ_Preparation: {
			columnsForStep = EXPERIMENT_COLUMNS
			break
		}
		case ProtocolNames.Illumina_Preparation: {
			columnsForStep = EXPERIMENT_COLUMNS
			break
		}
		default: {
			columnsForStep = DEFAULT_SAMPLE_COLUMNS
		}
	}

	// Return a copy of the array.
	return [...columnsForStep]
}