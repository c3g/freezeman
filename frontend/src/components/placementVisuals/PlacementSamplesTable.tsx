import React, { useCallback, useMemo } from "react"
import { Table, TableProps } from "antd";
import { ColumnsType, SelectionSelectFn, TableRowSelection } from "antd/lib/table/interface";
import { FMSId } from "../../models/fms_api_models";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { multiSelect } from "../../modules/placement/reducers";
import { selectParentContainer, selectPlacementState } from "../../modules/placement/selectors";
import { selectActiveDestinationContainer, selectActiveSourceContainer } from "../../modules/labworkSteps/selectors";
import { ParentContainerIdentifier } from "../../modules/placement/models";
import { compareArray, coordinatesToOffsets } from "../../utils/functions";

export interface PlacementSamplesTableProps {
    parentContainerName: string | null
    showContainerColumn?: boolean
}

interface PlacementSample {
    id: FMSId
    selected: boolean
    name: string
    projectName: string
    containerName: string
    parentContainerName: string | null
    coordinates: string | undefined
}

function rowKey(sample: PlacementSample): string {
    return `${sample.id}-${sample.coordinates}`
}

const PlacementSamplesTable = ({ parentContainerName, showContainerColumn }: PlacementSamplesTableProps) => {
    const parentContainerID: ParentContainerIdentifier = useMemo(() => ({ name: parentContainerName }), [parentContainerName])
    const dispatch = useAppDispatch()
    const container = useAppSelector((state) => selectParentContainer(state)(parentContainerID).state)
    const samplesByID = useAppSelector((state) => selectPlacementState(state).samples)
    const activeSourceContainer = useAppSelector(selectActiveSourceContainer)
    const activeDestinationContainer = useAppSelector(selectActiveDestinationContainer)

    const samples = useMemo(() => {
        const samples: PlacementSample[] = []
        if (container.name === null) {
            // handle tubes without parents
            for (const sampleID in container.samples) {
                const entry = container.samples[sampleID]
                const sample = samplesByID[sampleID]
                if (sample && entry) {
                    samples.push({
                        id: parseInt(sampleID),
                        selected: Boolean(entry.selected),
                        name: sample.name,
                        projectName: sample.projectName,
                        containerName: sample.containerName,
                        parentContainerName: sample.fromCell?.fromContainer?.name ?? null,
                        coordinates: sample.fromCell?.coordinates ?? undefined,
                    })
                }
            }
        } else {
            // handle real parent container
            for (const cellID in container.cells) {
                const entries = container.cells[cellID].samples
                for (const sampleID in entries) {
                    const entry = entries[sampleID]
                    const sample = samplesByID[sampleID]
                    if (sample && entry) {
                        samples.push({
                            id: parseInt(sampleID),
                            selected: Boolean(entry?.selected),
                            name: sample.name,
                            projectName: sample.projectName,
                            containerName: sample.containerName,
                            parentContainerName: sample.fromCell?.fromContainer?.name ?? '',
                            coordinates: cellID,
                        })
                    }
                }
            }
        }
        samples.sort((a, b) => {
            const MAX = 128

            let orderA = MAX
            let orderB = MAX

            if (a.selected) orderA -= MAX / 2
            if (b.selected) orderB -= MAX / 2

            if (container.name !== null && a.coordinates && b.coordinates)  {
                const aOffsets = coordinatesToOffsets(container.spec, a.coordinates)
                const bOffsets = coordinatesToOffsets(container.spec, b.coordinates)
                const arrayComparison = compareArray(aOffsets.reverse(), bOffsets.reverse())
                if (arrayComparison < 0) orderA -= MAX / 4
                if (arrayComparison > 0) orderB -= MAX / 4
            }

            if (a.name < b.name) orderA -= MAX / 8
            if (a.name > b.name) orderB -= MAX / 8

            if (a.containerName < b.containerName) orderA -= MAX / 16
            if (a.containerName > b.containerName) orderB -= MAX / 16

            if (a.projectName < b.projectName) orderA -= MAX / 32
            if (a.projectName > b.projectName) orderB -= MAX / 32

            return orderA - orderB
        })
        return samples
    }, [container, samplesByID])

    const selectedRowKeys = useMemo(
        () => samples.filter((s) => s.selected && s.id).map(rowKey),
        [samples]
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
    const onSelect: SelectionSelectFn<PlacementSample> = useCallback((sample, selected) => {
        if (!activeSourceContainer) return
        if (parentContainerID.name === null) {
            dispatch(multiSelect({
                forcedSelectedValue: selected,
                context: {
                    source: activeSourceContainer
                },
                type: 'sample-ids',
                parentContainer: parentContainerID,
                samples: [sample],
            }))
        } else {
            if (!sample.coordinates) return
            dispatch(multiSelect({
                forcedSelectedValue: selected,
                context: {
                    source: activeSourceContainer
                },
                type: 'samples-placements',
                parentContainer: parentContainerID,
                samples: [{ sample, cell: { fromContainer: parentContainerID, coordinates: sample.coordinates } }],
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
                sample.parentContainerName === parentContainerName
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

        if (parentContainerName !== null) {
            columns.push({
                title: 'Coords',
                dataIndex: 'coordinates',
                key: 'coordinates',
                width: `5rem`,
            })
        }

        return columns
    }, [parentContainerName, showContainerColumn])

    return (
        <Table<PlacementSample>
            dataSource={samples}
            columns={columns}
            rowKey={rowKey}
            rowSelection={selectionProps}
            pagination={paginationProps}
        />
    )
}
export default PlacementSamplesTable
