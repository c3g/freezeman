import { Protocol, Step } from '../../../models/frontend_models'
import { ProtocolNames } from '../../../models/protocols'
import { getStepSpecificationValue } from '../../../modules/steps/services'
import { LIBRARY_COLUMN_DEFINITIONS as LIBRARY_COLUMNS, ObjectWithLibrary } from './LibraryTableColumns'
import { IdentifiedTableColumnType, ObjectWithSample, SAMPLE_COLUMN_DEFINITIONS as SAMPLE_COLUMNS } from './SampleTableColumns'

export interface SampleAndLibrary extends ObjectWithSample, ObjectWithLibrary {}


/*
	Returns the default set of columns that should be used to display samples/libraries
	for a given protocol and step.
*/
export function getColumnsForStep(step: Step, protocol: Protocol): IdentifiedTableColumnType<SampleAndLibrary>[] {

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
		SAMPLE_COLUMNS.ID,
		LIBRARY_COLUMNS.LIBRARY_TYPE,
		SAMPLE_COLUMNS.NAME,
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
		SAMPLE_COLUMNS.CONTAINER_BARCODE,
		SAMPLE_COLUMNS.COORDINATES,		
		LIBRARY_COLUMNS.INDEX_NAME,
		SAMPLE_COLUMNS.VOLUME,
		SAMPLE_COLUMNS.CONCENTRATION,
		SAMPLE_COLUMNS.CREATION_DATE,
		SAMPLE_COLUMNS.DEPLETED,
	]

	const EXPERIMENT_COLUMNS = [
		SAMPLE_COLUMNS.ID,
		SAMPLE_COLUMNS.NAME,
		SAMPLE_COLUMNS.CONTAINER_BARCODE,
		SAMPLE_COLUMNS.COORDINATES,
		SAMPLE_COLUMNS.VOLUME,
		SAMPLE_COLUMNS.QC_FLAG,
		SAMPLE_COLUMNS.CREATION_DATE,
		SAMPLE_COLUMNS.DEPLETED
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
			const type = getStepSpecificationValue(step, 'Normalization Type')
			if (type === 'Library') {
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