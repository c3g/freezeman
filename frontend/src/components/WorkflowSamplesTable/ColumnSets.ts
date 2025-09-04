import { Protocol, Step, Workflow } from '../../models/frontend_models'
import { ProtocolNames } from '../../models/protocols'
import { getStepSpecificationValue } from '../../modules/steps/services'
import { IdentifiedTableColumnType } from '../pagedItemsTable/PagedItemsColumns'
import { LibraryColumn, LIBRARY_COLUMN_DEFINITIONS as LIBRARY_COLUMNS, ObjectWithLibrary } from '../libraries/LibraryTableColumns'
import { ObjectWithSample, SampleColumn, SampleColumnID, SAMPLE_COLUMN_DEFINITIONS as SAMPLE_COLUMNS } from '../samples/SampleTableColumns'
import { ObjectWithSampleIdentity, SAMPLE_IDENTITY_COLUMNS_DEFINITIONS as SAMPLE_IDENTITY_COLUMNS, SampleIdentityColumn } from '../samples/SampleIdentityColumns'

export interface SampleAndLibraryAndIdentity extends ObjectWithSample, ObjectWithLibrary, ObjectWithSampleIdentity {}


export function getColumnsForStudySamplesStep(step: Step, protocol: Protocol) {
	// A study is associated with a single project, so it doesn't make sense to include
	// a project column in study sample tables, so we filter it out.
	return getColumnsForStep(step, protocol).filter(column => column.columnID !== SampleColumnID.PROJECT)
}

/*
	Returns the default set of columns that should be used to display samples/libraries
	for a given protocol and step.
*/
export function getColumnsForStep(step: Step, protocol: Protocol | undefined): IdentifiedTableColumnType<SampleAndLibraryAndIdentity>[] {

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
		SAMPLE_COLUMNS.DEPLETED,
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
		SAMPLE_COLUMNS.DEPLETED,
	]

	const SAMPLE_IDENTITY_QC_COLUMNS = [
		SAMPLE_COLUMNS.ID,
		SAMPLE_COLUMNS.NAME,
		SAMPLE_COLUMNS.CONTAINER_BARCODE,
		SAMPLE_COLUMNS.COORDINATES,
		SAMPLE_IDENTITY_COLUMNS.CONCLUSIVE,
		SAMPLE_IDENTITY_COLUMNS.PREDICTED_SEX,
		SAMPLE_IDENTITY_COLUMNS.SEX_CONCORDANCE,
		SAMPLE_IDENTITY_COLUMNS.IDENTITY_MATCHES,
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
		SAMPLE_COLUMNS.DEPLETED,
	]

	let columnsForStep: (SampleColumn | LibraryColumn | SampleIdentityColumn)[] = DEFAULT_SAMPLE_COLUMNS

	switch(protocol?.name) {
		case ProtocolNames.Extraction: {
			columnsForStep = PRE_QC_SAMPLE_COLUMNS
			break
		}
		case ProtocolNames.Sample_Quality_Control: {
			columnsForStep = PRE_QC_SAMPLE_COLUMNS
			break
		}
		case ProtocolNames.Sample_Identity_Quality_Control: {
			columnsForStep = SAMPLE_IDENTITY_QC_COLUMNS
			break
		}
		case ProtocolNames.Sample_Pooling: {
			columnsForStep = [...DEFAULT_SAMPLE_COLUMNS, SAMPLE_COLUMNS.SAMPLE_COUNT]
			break
		}
		case ProtocolNames.Library_Preparation: {
			columnsForStep = DEFAULT_SAMPLE_COLUMNS
			break
		}
		case ProtocolNames.Transfer: {
			columnsForStep = [...PRE_QC_LIBRARY_COLUMNS, SAMPLE_COLUMNS.SAMPLE_COUNT]
			break
		}
		case ProtocolNames.Library_Quality_Control: {
			columnsForStep = [...PRE_QC_LIBRARY_COLUMNS, SAMPLE_COLUMNS.SAMPLE_COUNT]
			break
		}
		case ProtocolNames.Library_Capture: {
			columnsForStep = [...DEFAULT_LIBRARY_COLUMNS, SAMPLE_COLUMNS.SAMPLE_COUNT]
			break
		}
		case ProtocolNames.Library_Conversion: {
			columnsForStep = [...DEFAULT_LIBRARY_COLUMNS, SAMPLE_COLUMNS.SAMPLE_COUNT]
			break
		}
		case ProtocolNames.Normalization: {
			const type = getStepSpecificationValue(step, 'NormalizationType')
			if (type === 'Library') {
				columnsForStep = DEFAULT_LIBRARY_COLUMNS
			} else {
				columnsForStep = DEFAULT_SAMPLE_COLUMNS
			}
			break
		}
		case ProtocolNames.DNBSEQ_Preparation: {
			columnsForStep = [...EXPERIMENT_COLUMNS, SAMPLE_COLUMNS.SAMPLE_COUNT]
			break
		}
		case ProtocolNames.Illumina_Preparation: {
			columnsForStep = [...EXPERIMENT_COLUMNS, SAMPLE_COLUMNS.SAMPLE_COUNT]
			break
		}
		default: {
			columnsForStep = DEFAULT_SAMPLE_COLUMNS
		}
	}

	columnsForStep.push(
		SAMPLE_COLUMNS.PARENT_CONTAINER,
		SAMPLE_COLUMNS.PARENT_COORDINATES,
	)

	// Clone the columns on return
	return columnsForStep.map(column => {return {...column}})
}