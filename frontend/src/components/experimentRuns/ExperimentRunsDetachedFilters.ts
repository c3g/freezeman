import { FilterDescription } from "../../models/paged_items";
import { FILTER_TYPE } from '../../constants'

export const EXPERIMENT_RUNS_PLATFORM_NAME_FILTER: FilterDescription = {
    type: FILTER_TYPE.SELECT,
    key: 'run_type__platform__name',
    label: 'Platfor Name',
    mode: 'multiple',
    placeholder: 'All',
    options: [
        { label: 'Axiom - Genotyping', value: 'AXIOM_ARRAY' },
        { label: 'Illumina - Sequencing', value: 'ILLUMINA' },
    ],
}