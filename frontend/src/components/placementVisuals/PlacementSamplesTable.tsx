import React, { useCallback, useMemo } from "react"
import { Table, TableProps } from "antd";
import { ColumnsType, SelectionSelectFn, TableRowSelection } from "antd/lib/table/interface";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { multiSelect } from "../../modules/placement/reducers";
import { selectPlacementState } from "../../modules/placement/selectors";
import { selectActiveDestinationContainer, selectActiveSourceContainer } from "../../modules/labworkSteps/selectors";
import { ParentContainerIdentifier } from "../../modules/placement/models";
import { comparePlacementSamples, PlacementSample } from "../../utils/functions";
import { PlacementClass, RealParentContainerClass, TubesWithoutParentClass } from "../../modules/placement/classes";

export interface PlacementSamplesTableProps {
    parentContainerName: string | null
}

function rowKey(sample: Pick<PlacementSample, 'id' | 'coordinates'>): string {
    return `${sample.id}-${sample.coordinates}`
}

const PlacementSamplesTable = ({ parentContainerName }: PlacementSamplesTableProps) => {
    const parentContainerID: ParentContainerIdentifier = useMemo(() => ({ name: parentContainerName }), [parentContainerName])
    const dispatch = useAppDispatch()
    const placement = useAppSelector(selectPlacementState)
    const activeSourceContainer = useAppSelector(selectActiveSourceContainer)
    const activeDestinationContainer = useAppSelector(selectActiveDestinationContainer)
    const sourceOrDestination = parentContainerName === activeSourceContainer?.name ? 'source' : 'destination'
    
    const placementClass = useMemo(() => new PlacementClass(placement, undefined), [placement])
    const parentContainer = useMemo(() => placementClass.getParentContainer(parentContainerID), [parentContainerID, placementClass])

    const placementSamples = useMemo(() => {
        const placementSamples: PlacementSample[] = []
        if (parentContainer instanceof TubesWithoutParentClass) {
            // handle tubes without parents
            for (const sample of parentContainer.getSamples()) {
                placementSamples.push({
                    id: sample.getId(),
                    selected: parentContainer.isSampleSelected(sample.rawIdentifier()),
                    name: sample.getName(),
                    containerName: sample.getContainerName(),
                    fromCell: null,
                    placementCount: sample.state.placedAt.length
                })
            }
        } else {
            // handle real parent container
            for (const cell of parentContainer.getCells()) {
                for (const sample of cell.getSamples(true)) {
                    placementSamples.push({
                        id: sample.getId(),
                        selected: cell.isSampleSelected(sample.rawIdentifier()),
                        name: sample.getName(),
                        containerName: sample.getContainerName(),
                        coordinates: cell.getCoordinates(),
                        fromCell: sample.getFromCell()?.state ?? null,
                        placementCount: sample.state.placedAt.length
                    })
                }
            }
        }
        placementSamples.sort((a, b) => comparePlacementSamples(
            a, b,
            parentContainer instanceof RealParentContainerClass ? parentContainer.getSpec() : undefined
        ))
        return placementSamples
    }, [parentContainer])

    const selectedRowKeys = useMemo(
        () => placementSamples.filter((s) => s.selected && s.id).map(rowKey),
        [placementSamples]
    )
    const onChange: NonNullable<TableRowSelection<PlacementSample>['onChange']> = useCallback((keys, selectedRows, info) => {
        if (info.type === 'all' && activeSourceContainer) {
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
            if (parentContainer.getName() !== null) {
                columns.push({
                    title: 'Src Coords',
                    dataIndex: 'coordinates',
                    key: 'coordinates',
                    width: 120,
                })
            }
            columns.push({
                title: 'Dst Count',
                dataIndex: 'placementCount',
                key: 'count',
                width: 100,
            })
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
                    if (sample.fromCell?.fromContainer?.name !== parentContainer.getName()) {
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
    }, [parentContainer, sourceOrDestination])

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
