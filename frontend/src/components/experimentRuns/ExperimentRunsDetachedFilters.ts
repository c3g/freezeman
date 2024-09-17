import { FilterDescription } from "../../models/paged_items";
import { FILTER_TYPE } from '../../constants'

export enum RUN_TYPES {
    ILLUMINA = "Illumina",
    AXIOM = "Axiom",
    DNBSEQ = "DNBSEQ",
    INFINIUM =  "Infinium Global Screening Array-24",
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

export const EXPERIMENT_RUN_PROCESS_FILTER: FilterDescription = {
    type: FILTER_TYPE.SELECT,
    key: 'experiment_run_progress_stage',
    label: 'Experiment Run Stages',
    placeholder: 'All',
    options: Object.values(PROGRESS_FLAGS).map((flag) => ({label: flag.toUpperCase(), value: flag})),
}
