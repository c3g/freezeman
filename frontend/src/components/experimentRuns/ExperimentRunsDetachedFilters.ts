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

export const EXPERIMENT_RUNS_VALIDATION_STATUS_FILTER: FilterDescription = {
    type: FILTER_TYPE.SELECT,
    key: 'datasets__readsets__validation_status',
    label: 'Has validated lanes',
    placeholder: 'All',
    options: [
        { label: 'Has Validated lanes', value: '1' },
        { label: 'Has Failed lanes', value: '2' },
    ],
}

export const EXPERIMENT_RUNS_RELEASED_FILTER: FilterDescription = {
    type: FILTER_TYPE.SELECT,
    key: 'datasets__readsets__release_status',
    label: 'Released lanes',
    placeholder: 'All',
    options: [
        { label: 'Available', value: '0' },
        { label: 'Released', value: '1' },
        { label: 'Blocked', value: '2' },
    ],
}

export const EXPERIMENT_RUN_PROCESS_FILTER: FilterDescription = {
    type: FILTER_TYPE.SELECT,
    key: 'experiment_run_process',
    label: 'Experiment Run Steps',
    placeholder: 'All',
    options: [
        { label: 'Processed', value: 'processed' },
        { label: 'Validated ', value: 'validated' },
        { label: 'Released', value: 'released' },
    ],
}