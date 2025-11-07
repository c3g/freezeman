import React, { useCallback } from "react"
import { FMSPooledSample } from "../../models/fms_api_models"
import { Table } from "antd"
import { useAppDispatch, useAppSelector } from "../../hooks"
import api from "../../utils/api"
import { ColumnDefinitions, FilterDescriptions, FilterKeys, SearchPropertiesDefinitions, useBasicTableProps } from "../../utils/tablePlugins"
import { selectCurrentPreference } from "../../modules/profiles/selectors"

enum PooledSampleColumnID {
    ALIAS = 'ALIAS',
    CONTAINER_BARCODE = 'CONTAINER_BARCODE',
    COORDINATES = 'COORDINATES',
    INDEX = 'INDEX',
}

const FILTER_KEYS: FilterKeys<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: 'derived_sample__biosample__alias',
    [PooledSampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
    [PooledSampleColumnID.COORDINATES]: 'sample__coordinate__name',
    [PooledSampleColumnID.INDEX]: 'derived_sample__library__index__name',
} as const

const FILTER_DESCRIPTIONS: FilterDescriptions<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: { type: 'startswith' },
    [PooledSampleColumnID.CONTAINER_BARCODE]: { type: 'startswith' },
    [PooledSampleColumnID.COORDINATES]: { type: 'startswith' },
    [PooledSampleColumnID.INDEX]: { type: 'startswith' },
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
        key: 'container_barcode'
    },
    [PooledSampleColumnID.COORDINATES]: {
        title: 'Coordinates',
        dataIndex: 'coordinates',
        key: 'coordinates'
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
    [PooledSampleColumnID.INDEX]: { placeholder: 'Index Name' },
}

export function IndexCuration() {
    const dispatch = useAppDispatch()
    const fetchPooledSamples = useCallback(async (pageNumber: number, pageSize: number, filters: Record<string, string>) => {
        const response = await dispatch(api.pooledSamples.list({
            offset: (pageNumber - 1) * pageSize,
            limit: pageSize,
            ...filters
        }))
        return {
            total: response.data.count,
            data: response.data.results
        }
    }, [dispatch])

    const defaultPageSize = useAppSelector(state => selectCurrentPreference(state, 'table.sample.page-limit'))
    const tableProps = useBasicTableProps({
        defaultPageSize,
        fetchRowData: fetchPooledSamples,
        rowKey: "id",
        columnDefinitions: COLUMN_DEFINITIONS,
        filterKeys: FILTER_KEYS,
        filterDescriptions: FILTER_DESCRIPTIONS,
        searchDefinitions: SEARCH_DEFINITIONS,
    })

    return (
        <>
            <Table<FMSPooledSample>
                {...tableProps}
                scroll={{ y: '80vh' }}
            />
        </>
    )
}
