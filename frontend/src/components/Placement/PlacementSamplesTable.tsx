import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Table, TableProps } from "antd";
import { ColumnsType, SelectionSelectFn, TableRowSelection } from "antd/lib/table/interface";
import { FMSId } from "../../models/fms_api_models";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { multiSelect } from "../../modules/placement/reducers";
import { selectSamplesByID } from "../../selectors";
import { fetchSamples } from "../../modules/cache/cache";
import { selectCell, selectParentContainer, selectPlacementSamples } from "../../modules/placement/selectors";
import { selectActiveDestinationContainer, selectActiveSourceContainer } from "../../modules/labworkSteps/selectors";
import { comparePlacementSamples } from "../../modules/placement/helpers";

export interface PlacementSamplesTableProps {
    container: string | null
    showContainerColumn?: boolean
}

interface PlacementSample {
    id: FMSId
    selected: boolean
    name: string
    projectName: string
    parentContainerName: string
    coordinates: string | undefined
}

//component used to display and select samples in a table format for plate visualization placement
const PlacementSamplesTable = ({ container: containerName, showContainerColumn }: PlacementSamplesTableProps) => {
    const dispatch = useAppDispatch()
    const placementSamples = useAppSelector((state) => selectPlacementSamples(state, containerName)).sort(comparePlacementSamples)

    const activeSourceContainer = useAppSelector(selectActiveSourceContainer)
    const activeDestinationContainer = useAppSelector(selectActiveDestinationContainer)
    const isDestination = activeDestinationContainer?.name === containerName

    const selectedRowKeys = useMemo(
        () => placementSamples.reduce((sampleIDs, s) => {
            if (s.selected && s.id) {
                sampleIDs.push(s.id)
            }
            return sampleIDs
        }, [] as FMSId[]),
        [placementSamples]
    )
    const onChange: NonNullable<TableRowSelection<PlacementSample>['onChange']> = useCallback((keys, selectedRows, info) => {
        if (info.type === 'all') {
            dispatch(multiSelect({
                type: 'all',
                parentContainer: containerName,
            }))
        }
    }, [containerName, dispatch])
    const onSelect: SelectionSelectFn<PlacementSample> = useCallback((sample, selected) => {
        dispatch(multiSelect({
            type: 'sample-identifiers',
            parentContainer: containerName,
            samples: [sample.id],
            forcedSelectedValue: selected,
        }))
    }, [containerName, dispatch])
    const selectionProps: TableRowSelection<PlacementSample> = useMemo(() =>  ({
        selectedRowKeys,
        onChange,
        onSelect,
        getCheckboxProps: (sample) => ({
            // disable checkbox if the sample is already placed in the destination container
            disabled: isDestination && sample.parentContainerName === containerName
        })
    }), [selectedRowKeys, onChange, onSelect, isDestination, containerName])

    const paginationProps: NonNullable<TableProps<PlacementSample>['pagination']> = useMemo(() => ({
        showSizeChanger: true,
        showTotal(total, range) {
            return <>
                <>{`${range[0]}-${range[1]} of ${total} items.`}</>
                <>{' '}</>
                <b style={{ color: '#1890ff' }}>{`${selectedRowKeys.length} selected`}</b>
                .
            </>
        }
    }), [selectedRowKeys.length])

    const columns = useMemo(() => {
        const columns: ColumnsType<PlacementSample> = []

        columns.push({
                title: 'Project',
                dataIndex: 'projectName',
                key: 'projectName',
        })

        if (showContainerColumn) {
            columns.push({
                title: 'Src Container',
                dataIndex: 'parentContainerName',
                key: 'parentContainerName',
            })
        }

        columns.push({
            title: 'Sample',
            dataIndex: 'name',
            key: 'name',
        })

        if (containerName !== null) {
            columns.push({
                title: 'Coords',
                dataIndex: 'coordinates',
                key: 'coordinates',
                width: `5rem`,
            })
        }

        return columns
    }, [containerName, showContainerColumn])

    return (
        <Table<PlacementSample>
            dataSource={samples}
            columns={columns}
            rowKey={obj => obj.id}
            rowSelection={selectionProps}
            pagination={paginationProps}
        />
    )
}
export default PlacementSamplesTable
