import { FilterDescription } from "../../models/paged_items";
import { FILTER_TYPE } from '../../constants'

export const EXPERIMENT_RUNS_PLATFORM_NAME_FILTER: FilterDescription = {
    type: FILTER_TYPE.SELECT,
    key: 'run_type__platform__name',
    label: 'Platform Name',
    mode: 'multiple',
    placeholder: 'All',
    options: [
        { label: 'Axiom', value: 'AXIOM_ARRAY' },
        { label: 'Illumina', value: 'ILLUMINA' },
    ],
}

export const EXPERIMENT_RUN_PROCESS_FILTER: FilterDescription = {
    type: FILTER_TYPE.SELECT,
    key: 'experiment_run_progress_stage',
    label: 'Experiment Run Steps',
    placeholder: 'All',
    options: [
        { label: 'Processed', value: 'processed' },
        { label: 'Validated ', value: 'validated' },
        { label: 'Released', value: 'released' },
    ],
}