import React, { useCallback, useEffect, useMemo } from "react";
import { ColumnDefinitions, createQueryParamsFromFilters, FetchRowData, FilterDescriptions, Filters, useFilters, usePaginatedDataProps, useTableColumnsProps, useTableSortByProps } from "../../utils/tableHooks";
import { EXPERIMENT_RUN_COLUMN_DEFINITIONS, EXPERIMENT_RUN_FILTER_KEYS, ExperimentRunColumn, ObjectWithExperimentRun, ExperimentRunColumnID as OriginalID } from "./ExperimentRunTableColumns";
import api from "../../utils/api";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectExperimentRunLaunches, selectInstrumentsByID, selectRunTypesByID } from "../../selectors";
import { ConfigProvider, Pagination, Table } from "antd";
import dayjs from "dayjs";

import relativeTime from "dayjs/plugin/relativeTime"
dayjs.extend(relativeTime)

export enum ExperimentRunColumnID {
    ID = OriginalID.ID,
    NAME = OriginalID.NAME,
    RUN_TYPE = OriginalID.RUN_TYPE,
    INSTRUMENT = OriginalID.INSTRUMENT,
    INSTRUMENT_TYPE = OriginalID.INSTRUMENT_TYPE,
    CONTAINER_BARCODE = OriginalID.CONTAINER_BARCODE,
    START_DATE = OriginalID.START_DATE,
    LAUNCH = OriginalID.LAUNCH,
    LAUNCHED = "LAUNCHED",
    PROCESSED = "PROCESSED",
}

const defaultExperimentColumns: ExperimentRunColumnID[] = [
    ExperimentRunColumnID.ID,
    ExperimentRunColumnID.NAME
] as const

const filterDescriptions: FilterDescriptions<ExperimentRunColumnID> = {
    [ExperimentRunColumnID.ID]: { type: 'INPUT', startsWith: true, exactMatch: false },
    [ExperimentRunColumnID.NAME]: { type: 'INPUT', startsWith: true, exactMatch: false },
} as const

type TableProps = React.ComponentProps<typeof Table>

export interface SimpleExperimentRunTableProps {
    defaultPageSize: number
    fixedQueryParams?: Record<string, any>
    columnIDs?: readonly ExperimentRunColumnID[]
    requestIDSuffix?: string
    tableHeight?: NonNullable<TableProps['style']>['height']
    tableProps?: Partial<Pick<TableProps, 'pagination' | 'locale' | 'className'>>
}
function SimpleExperimentRunTable({ defaultPageSize, fixedQueryParams, columnIDs = defaultExperimentColumns, requestIDSuffix = '', tableHeight = '75vh', tableProps }: SimpleExperimentRunTableProps) {
    const dispatch = useAppDispatch()

    const launchesByID = useAppSelector(selectExperimentRunLaunches).launchesById
    const runTypesByID  = useAppSelector(selectRunTypesByID)
    const instrumentsByID = useAppSelector(selectInstrumentsByID)
    const experimentRunColumnDefinitions = useMemo<ColumnDefinitions<ExperimentRunColumnID, ObjectWithExperimentRun>>(() => {
        const definitions: Partial<Record<ExperimentRunColumnID, ExperimentRunColumn>> = EXPERIMENT_RUN_COLUMN_DEFINITIONS(launchesByID, runTypesByID, instrumentsByID)
        const keys = Object.keys(ExperimentRunColumnID) as ExperimentRunColumnID[]
        for (const key of keys) {
            if (!columnIDs.includes(key)) {
                delete definitions[key]
            } else if (key === ExperimentRunColumnID.LAUNCH && definitions[key]) {
                definitions[key] = {
                    ...definitions[key],
                    sorter: false,
                    width: 100,
                    render: (_, { experimentRun }) => dayjs(experimentRun.run_processing_launch_time).fromNow()
                }
            } else if (key === ExperimentRunColumnID.PROCESSED) {
                definitions[key] = {
                    columnID: ExperimentRunColumnID.PROCESSED,
                    sorter: false,
                    title: 'Processed',
                    dataIndex: ['experimentRun', 'run_processing_end_time'],
                    width: 100,
                    render: (_, { experimentRun }) => {
                        return dayjs(experimentRun.run_processing_end_time).format("YYYY-MM-DD")
                    }
                }
            } else if (key === ExperimentRunColumnID.START_DATE && definitions[key]) {
                definitions[key] = {
                    ...definitions[key],
                    align: 'start',
                    render: (_, { experimentRun }) => dayjs(experimentRun.start_date).fromNow(),
                    sorter: false,
                    width: 100
                }
            }
            if (definitions[key]) {
                definitions[key] = {
                    ...definitions[key],
                    sorter: false,
                }
            }
        }
        return definitions
    }, [columnIDs, instrumentsByID, launchesByID, runTypesByID])

    const fetchExperimentRuns = React.useCallback<FetchRowData<ExperimentRunColumnID, ObjectWithExperimentRun>>(async ({
        pageNumber, pageSize, filters, sortBy
    }) => {
        const response = await dispatch(api.experimentRuns.list(
            {
                ...createQueryParamsFromFilters(EXPERIMENT_RUN_FILTER_KEYS, filterDescriptions, filters),
                offset: (pageNumber - 1) * pageSize,
                limit: pageSize,
                ...fixedQueryParams
            },
            true,
            `ExperimentRunListContent.fetchExperimentRuns${requestIDSuffix}`,
        ))

        return {
            total: response.data.count,
            data: response.data.results.map<ObjectWithExperimentRun>(experimentRun => (
                { experimentRun: { ...experimentRun, isFetching: false, isLoaded: true, isRemoving: false } }
            ))
        }
    }, [dispatch, fixedQueryParams, requestIDSuffix])

    const [tableDataProps, paginationProps, { fetchRowData }] = usePaginatedDataProps({
        defaultPageSize: 25,
        fetchRowData: fetchExperimentRuns,
        bodySpinStyle: useMemo(() => ({ height: tableHeight, alignContent: 'center' }), [tableHeight])
    })

    const DEBOUNCE_DELAY = 500

    const debouncedOnSort = useCallback((newSortBy: Partial<Record<ExperimentRunColumnID, 'ascend' | 'descend'>>) => {
        fetchRowData({ sortBy: newSortBy, pageNumber: 1 }, DEBOUNCE_DELAY)
    }, [fetchRowData])
    const [tableSortByProps, { sortBy }] = useTableSortByProps<ExperimentRunColumnID, ObjectWithExperimentRun>(debouncedOnSort)

    const debouncedOnFilter = useCallback((newFilters: Filters<ExperimentRunColumnID>) => {
        fetchRowData({ filters: newFilters, pageNumber: 1 }, DEBOUNCE_DELAY)
    }, [fetchRowData])
    const [filters, setFilters] = useFilters<ExperimentRunColumnID>({}, debouncedOnFilter)

    const tableColumnsProps = useTableColumnsProps<ExperimentRunColumnID, ObjectWithExperimentRun>({
        filters,
        setFilters,
        filterDescriptions,
        columnDefinitions: experimentRunColumnDefinitions,
        searchPropertyDefinitions: {},
        sortBy,
    })

    useEffect(() => {
        fetchRowData({ pageNumber: 1, pageSize: defaultPageSize })
    }, [defaultPageSize, fetchRowData])

    const ROW_KEY = useCallback((record: ObjectWithExperimentRun) => {
        return record.experimentRun.id ?? ''
    }, [])

    return (<ConfigProvider
        theme={{
            components: {
                Table: {
                    cellPaddingBlock: 0
                },
            },
        }}
        >
            <Table<ObjectWithExperimentRun>
                {...tableDataProps}
                {...tableSortByProps}
                {...tableColumnsProps}
                rowKey={ROW_KEY}
                scroll={{ y: tableHeight }}
                bordered
                {...tableProps}
            />
            <Pagination
                {...paginationProps}
                style={{ paddingBottom: '1em' }}
            />
    </ConfigProvider>)
}

export default SimpleExperimentRunTable
