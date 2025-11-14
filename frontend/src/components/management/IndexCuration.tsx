import React, { useCallback, useEffect, useMemo, useState } from "react"
import { FMSId, FMSPooledSample, FMSTemplateAction, FMSTemplatePrefillOption } from "../../models/fms_api_models"
import { Button, Flex, Space, Table, Typography } from "antd"
import { useAppDispatch, useAppSelector } from "../../hooks"
import api from "../../utils/api"
import { ColumnDefinitions, createQueryParamsFromFilters, FilterDescriptions, FilterKeys, newFilterDefinitionsToFilterSet, SearchPropertiesDefinitions, usePaginatedDataProps, useSmartSelection, useTableColumns } from "../../utils/tableHooks"
import { selectCurrentPreference } from "../../modules/profiles/selectors"
import { FILTER_TYPE } from "../../constants"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import { Link } from "react-router-dom"
import { ActionDropdown } from "../../utils/templateActions"
import { PrefilledTemplatesDropdown } from "../../utils/prefillTemplates"
import { smartQuerySetLookup } from "../../utils/functions"
import { QuestionCircleOutlined } from "@ant-design/icons"
import FiltersBar from "../filters/filtersBar/FiltersBar"

enum PooledSampleColumnID {
    ALIAS = 'ALIAS',
    CONTAINER_BARCODE = 'CONTAINER_BARCODE',
    COORDINATES = 'COORDINATES',
    PROJECT = 'PROJECT',
    INDEX = 'INDEX',
}

const FILTER_KEYS: FilterKeys<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: 'derived_sample__biosample__alias',
    [PooledSampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
    [PooledSampleColumnID.COORDINATES]: 'sample__coordinate__name',
    [PooledSampleColumnID.PROJECT]: 'project__name',
    [PooledSampleColumnID.INDEX]: 'derived_sample__library__index__name',
} as const

const FILTER_DESCRIPTIONS: FilterDescriptions<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: { type: FILTER_TYPE.INPUT, lookup_type: 'startswith' },
    [PooledSampleColumnID.CONTAINER_BARCODE]: { type: FILTER_TYPE.INPUT, lookup_type: 'startswith' },
    [PooledSampleColumnID.COORDINATES]: { type: FILTER_TYPE.INPUT, lookup_type: 'startswith' },
    [PooledSampleColumnID.PROJECT]: { type: FILTER_TYPE.INPUT, lookup_type: 'startswith' },
    [PooledSampleColumnID.INDEX]: { type: FILTER_TYPE.INPUT, lookup_type: 'startswith' },
} as const

const COLUMN_DEFINITIONS: ColumnDefinitions<PooledSampleColumnID, FMSPooledSample> = {
    [PooledSampleColumnID.ALIAS]: {
        title: 'Name',
        dataIndex: 'alias',
        key: 'alias'
    },
    [PooledSampleColumnID.CONTAINER_BARCODE]: {
        title: 'Container Barcode',
        dataIndex: 'container_barcode',
        key: 'container_barcode',
        render: (_: any, record: FMSPooledSample) => (
            <Link to={`/containers/${record.container_id}`}>{record.container_barcode}</Link>
        ),
    },
    [PooledSampleColumnID.COORDINATES]: {
        title: 'Coordinates',
        dataIndex: 'coordinates',
        key: 'coordinates',
        width: 130,
        align: 'center',
    },
    [PooledSampleColumnID.PROJECT]: {
        title: 'Project',
        dataIndex: 'project_name',
        key: 'project_name',
        render: (_: any, record: FMSPooledSample) => (
            <Link to={`/projects/${record.project_id}`}>{record.project_name}</Link>
        ),
    },
    [PooledSampleColumnID.INDEX]: {
        title: 'Current Index',
        dataIndex: 'index',
        key: 'index'
    },
} as const

const SEARCH_DEFINITIONS: SearchPropertiesDefinitions<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: { placeholder: 'Sample Name' },
    [PooledSampleColumnID.CONTAINER_BARCODE]: { placeholder: 'Container Barcode' },
    [PooledSampleColumnID.COORDINATES]: { placeholder: 'Coordinates' },
    [PooledSampleColumnID.PROJECT]: { placeholder: 'Project Name' },
    [PooledSampleColumnID.INDEX]: { placeholder: 'Index Name' },
}

export function IndexCuration() {
    const dispatch = useAppDispatch()

    const defaultPageSize = useAppSelector(state => selectCurrentPreference(state, 'table.sample.page-limit'))
    const fetchPooledSamples = useCallback(async (pageNumber: number, pageSize: number, filters: Partial<Record<PooledSampleColumnID, string>>) => {
        const queryParams = createQueryParamsFromFilters(FILTER_KEYS, FILTER_DESCRIPTIONS, filters)
        const response = await dispatch(api.pooledSamples.list(
            {
                ...queryParams,
                include_pools_of_one: true, derived_sample__library__isnull: false,
                offset: (pageNumber - 1) * pageSize,
                limit: pageSize,
            },
            {
                abort: true,
                requestID: 'IndexCuration.fetchPooledSamples'
            }
        ))
        return {
            total: response.data.count,
            data: response.data.results
        }
    }, [dispatch])

    const [filters, setFilters] = useState<Partial<Record<PooledSampleColumnID, string>>>({})

    const {
        dataSource,
        pagination,
        loading
    } = usePaginatedDataProps(
        defaultPageSize,
        fetchPooledSamples,
        filters,
    )

    const rowKey = "id"

    const [
        rowSelection,
        {
            resetSelection,
            defaultSelection,
            exceptedItems,
            totalSelectionCount
        }
    ] = useSmartSelection<FMSPooledSample>(
        pagination.total,
        dataSource,
        rowKey,
    )

    const paginationOnChange = pagination.onChange
    const mySetFilter = useCallback((searchKey: PooledSampleColumnID, text: string) => {
        paginationOnChange(1)
        resetSelection()
        setFilters((prev) => {
            if (text) {
                return { ...prev, [searchKey]: text }
            } else {
                const newFilters = { ...prev }
                delete newFilters[searchKey]
                return newFilters
            }
        })
    }, [paginationOnChange, resetSelection, setFilters])
    const columns = useTableColumns<PooledSampleColumnID, FMSPooledSample>(
        mySetFilter,
        filters,
        COLUMN_DEFINITIONS,
        SEARCH_DEFINITIONS,
    )

    const [templateActions, setTemplateActions] = useState<{ items: FMSTemplateAction[] }>({ items: [] })
    useEffect(() => {
        dispatch(api.pooledSamples.template.actions()).then(response => {
            setTemplateActions({
                items: response.data
            })
        })
    }, [dispatch])

    const [prefills, setPrefills] = useState<{ items: FMSTemplatePrefillOption[] }>({ items: [] })
    useEffect(() => {
        dispatch(api.pooledSamples.prefill.templates()).then(response => {
            setPrefills({
                items: response.data
            })
        })
    }, [dispatch])

    const filtersAsOptions = useMemo(() => createQueryParamsFromFilters(FILTER_KEYS, FILTER_DESCRIPTIONS, filters), [filters])
    const prefillTemplate = useCallback(({ template }: { template: FMSId }) => {
        return dispatch(api.pooledSamples.prefill.request(
            {
                ...filtersAsOptions,
                ...smartQuerySetLookup('id', defaultSelection, exceptedItems.map(id => Number(id))),
            },
            template
        ))
    }, [defaultSelection, dispatch, exceptedItems, filtersAsOptions])

    const filterSet = useMemo(() => newFilterDefinitionsToFilterSet<PooledSampleColumnID>(filters, FILTER_DESCRIPTIONS, FILTER_KEYS, SEARCH_DEFINITIONS), [filters])

    return (
        <>
            <AppPageHeader
				title = "Index Curation"
                extra = {[
                    <ActionDropdown key="actions" urlBase={'/management/index-curations'} actions={templateActions} />,
                    <PrefilledTemplatesDropdown key='prefills' prefillTemplate={prefillTemplate} totalCount={totalSelectionCount} prefills={prefills}/>,
                ]}
			/>
            <PageContent>
                <Space direction={"vertical"} style={{ width: '100%' }}>
                    <FiltersBar filters={filterSet} clearFilters={() => setFilters({})} />
                    <Table<FMSPooledSample>
                        dataSource={dataSource}
                        pagination={pagination}
                        loading={loading}
                        rowSelection={rowSelection}
                        columns={columns}
                        rowKey={rowKey}
                        scroll={{ y: '75vh' }}
                        bordered
                    />
                </Space>
            </PageContent>
        </>
    )
}
