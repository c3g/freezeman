import React, { useCallback, useMemo } from "react"
import { Table, TableProps } from "antd";
import { ColumnsType, SelectionSelectFn, TableRowSelection } from "antd/lib/table/interface";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { multiSelect } from "../../modules/placement/reducers";
import { selectParentContainer, selectPlacementState } from "../../modules/placement/selectors";
import { selectActiveDestinationContainer, selectActiveSourceContainer } from "../../modules/labworkSteps/selectors";
import { ParentContainerIdentifier } from "../../modules/placement/models";
import { comparePlacementSamples, PlacementSample } from "../../utils/functions";

export interface PlacementSamplesTableProps {
    parentContainerName: string | null
}

function rowKey(sample: Pick<PlacementSample, 'id' | 'coordinates'>): string {
    return `${sample.id}-${sample.coordinates}`
}

const PlacementSamplesTable = ({ parentContainerName }: PlacementSamplesTableProps) => {
    const parentContainerID: ParentContainerIdentifier = useMemo(() => ({ name: parentContainerName }), [parentContainerName])
    const dispatch = useAppDispatch()
    const parentContainer = useAppSelector((state) => selectParentContainer(state)(parentContainerID).state)
    const samplesByID = useAppSelector((state) => selectPlacementState(state).samples)
    const activeSourceContainer = useAppSelector(selectActiveSourceContainer)
    const activeDestinationContainer = useAppSelector(selectActiveDestinationContainer)
    const sourceOrDestination = parentContainerName === activeSourceContainer?.name ? 'source' : 'destination'

    const placementSamples = useMemo(() => {
        const placementSamples: PlacementSample[] = []
        if (parentContainer.name === null) {
            // handle tubes without parents
            for (const sampleID in parentContainer.samples) {
                const entry = parentContainer.samples[sampleID]
                const sample = samplesByID[sampleID]
                if (sample && entry) {
                    placementSamples.push({
                        id: parseInt(sampleID),
                        selected: Boolean(entry.selected),
                        name: sample.name,
                        containerName: sample.containerName,
                        fromCell: sample.fromCell
                    })
                }
            }
        } else {
            // handle real parent container
            for (const cellID in parentContainer.cells) {
                const entries = parentContainer.cells[cellID].samples
                for (const sampleID in entries) {
                    const entry = entries[sampleID]
                    const sample = samplesByID[sampleID]
                    if (sample && entry) {
                        placementSamples.push({
                            id: parseInt(sampleID),
                            selected: Boolean(entry?.selected),
                            name: sample.name,
                            containerName: sample.containerName,
                            coordinates: cellID,
                            fromCell: sample.fromCell
                        })
                    }
                }
            }
        }
        placementSamples.sort((a, b) => comparePlacementSamples(a, b, 'spec' in parentContainer ? parentContainer.spec : undefined))
        return placementSamples
    }, [parentContainer, samplesByID])

    const selectedRowKeys = useMemo(
        () => placementSamples.filter((s) => s.selected && s.id).map(rowKey),
        [placementSamples]
    )
    const onChange: NonNullable<TableRowSelection<PlacementSample>['onChange']> = useCallback((keys, selectedRows, info) => {
        if (info.type === 'all') {
            dispatch(multiSelect({
                type: 'all',
                parentContainer: parentContainerID,
                context: {
                    source: activeSourceContainer
                }
            }))
        }
    }, [activeSourceContainer, parentContainerID, dispatch])
    const onSelect: SelectionSelectFn<PlacementSample> = useCallback((placementSample, selected) => {
        if (!activeSourceContainer) return
        if (parentContainerID.name === null) {
            dispatch(multiSelect({
                forcedSelectedValue: selected,
                context: {
                    source: activeSourceContainer
                },
                type: 'sample-ids',
                parentContainer: parentContainerID,
                samples: [placementSample],
            }))
        } else {
            if (!placementSample.coordinates) return
            dispatch(multiSelect({
                forcedSelectedValue: selected,
                context: {
                    source: activeSourceContainer
                },
                type: 'samples-placements',
                parentContainer: parentContainerID,
                samples: [{ sample: placementSample, cell: { fromContainer: parentContainerID, coordinates: placementSample.coordinates } }],
            }))
        }
    }, [activeSourceContainer, parentContainerID, dispatch])
    const selectionProps: TableRowSelection<PlacementSample> = useMemo(() =>  ({
        selectedRowKeys,
        onChange,
        onSelect,
        getCheckboxProps: (sample) => ({
            // disable checkbox if the sample is already placed in the destination container
            disabled:
                // is current parent container the active destination container
                parentContainerName === activeDestinationContainer?.name &&
                // is the sample already placed in the destination container
                sample.fromCell?.fromContainer?.name === parentContainerName
        })
    }), [selectedRowKeys, onChange, onSelect, parentContainerName, activeDestinationContainer?.name])

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
        if (sourceOrDestination === 'source') {
            columns.push({
                title: 'Sample',
                dataIndex: 'name',
                key: 'name',
            })
            columns.push({
                title: 'Src Container',
                dataIndex: 'containerName',
                key: 'containerName',
            })
            if (parentContainer.name !== null) {
                columns.push({
                    title: 'Src Coords',
                    dataIndex: 'coordinates',
                    key: 'coordinates',
                })
            }
        } else {
            columns.push({
                title: 'Sample',
                dataIndex: 'name',
                key: 'name'
            })
            columns.push({
                title: 'Src Container (Coords)',
                key: 'src-container-coords',
                render: (sample: PlacementSample) => {
                    if (sample.fromCell?.fromContainer?.name !== parentContainer.name) {
                        return sample.fromCell
                            ? `${sample.fromCell.fromContainer.name} (${sample.fromCell.coordinates})`
                            : `${sample.containerName} (—)`
                    }
                }
            })
            columns.push({
                title: 'Dst Coords',
                key: 'coordinates',
                dataIndex: 'coordinates'
            })
        }
        return columns
    }, [parentContainer.name, sourceOrDestination])

    return (
        <Table<PlacementSample>
            dataSource={placementSamples}
            columns={columns}
            rowKey={rowKey}
            rowSelection={selectionProps}
            pagination={paginationProps}
        />
    )
}
export default PlacementSamplesTable
