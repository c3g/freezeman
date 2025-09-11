import { FilterDescription } from "../../models/paged_items";
import { FILTER_TYPE } from '../../constants'
import { capitalize } from '../../utils/capitalize'

export enum RUN_TYPES {
    ILLUMINA = "Illumina",
    AXIOM = "Axiom",
    PACBIO = "PacBio",
    DNBSEQ = "DNBSEQ",
    INFINIUM =  "Infinium",
}

export enum PROGRESS_FLAGS {
    PROCESSED = "processed",
    VALIDATED = "validated",
    RELEASED = "released",
}

export const EXPERIMENT_RUNS_PLATFORM_NAME_FILTER: FilterDescription = {
    type: FILTER_TYPE.SELECT,
    key: 'run_type__name',
    label: 'Run Type',
    mode: 'multiple',
    placeholder: 'All',
    options: Object.values(RUN_TYPES).map((runType) => ({label: runType, value: runType})),
}

export const EXPERIMENT_RUN_PROGRESS_FILTER: FilterDescription = {
    type: FILTER_TYPE.SELECT,
    key: 'experiment_run_progress_stage',
    label: 'Experiment Run Stages',
    placeholder: 'All',
    options: Object.values(PROGRESS_FLAGS).map((flag) => ({label: capitalize(flag), value: flag})),
}
