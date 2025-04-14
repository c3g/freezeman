import React, { useCallback, useEffect, useMemo, useState } from "react"
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
    container: string | null
    showContainerColumn?: boolean
}

interface PlacementSample {
    id: FMSId
    selected: boolean
    name: string
    projectName: string
    containerName: string
    parentContainerName: string
    coordinates: string | undefined
}

//component used to display and select samples in a table format for plate visualization placement
const PlacementSamplesTable = ({ container: containerName, showContainerColumn }: PlacementSamplesTableProps) => {
    const containerID: ParentContainerIdentifier = useMemo(() => ({ name: containerName }), [containerName])
    const dispatch = useAppDispatch()
    // TODO: use sorted selected items instead when the field is defined in the labwork-refactor
    const container = useAppSelector((state) => selectParentContainer(state)(containerID).state)
    const samplesByID = useAppSelector((state) => selectPlacementState(state).samples)
    const activeSourceContainer = useAppSelector(selectActiveSourceContainer)
    const activeDestinationContainer = useAppSelector(selectActiveDestinationContainer)
    const isSource = containerName === activeSourceContainer?.name
    const isDestination = containerName === activeDestinationContainer?.name

    const [samples, setSamples] = useState<PlacementSample[]>([])
    useEffect(() => {
        const samples: PlacementSample[] = []
        if (container.name === null) {
            for (const sampleID in container.samples) {
                const entry = container.samples[sampleID]
                const sample = samplesByID[sampleID]
                if (sample && entry) {
                    samples.push({
                        id: parseInt(sampleID),
                        selected: entry?.selected,
                        name: sample.name,
                        projectName: sample.projectName,
                        containerName: sample.containerName,
                        parentContainerName: sample.fromCell?.fromContainer?.name ?? '',
                        coordinates: sample.fromCell?.coordinates ?? undefined,
                    })
                }
            }
        } else {
            for (const cellID in container.cells) {
                const entries = container.cells[cellID].samples
                for (const sampleID in entries) {
                    const entry = entries[sampleID]
                    const sample = samplesByID[sampleID]
                    if (sample && entry) {
                        samples.push({
                            id: parseInt(sampleID),
                            selected: entry?.selected,
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
        setSamples(samples)
    }, [container, isDestination, isSource, samplesByID])

    const selectedRowKeys = useMemo(
        () => container ? samples.reduce((sampleIDs, s) => {
            if (s.selected && s.id) {
                sampleIDs.push(s.id)
            }
            return sampleIDs
        }, [] as FMSId[]) : [],
        [container, samples]
    )
    const onChange: NonNullable<TableRowSelection<PlacementSample>['onChange']> = useCallback((keys, selectedRows, info) => {
        if (info.type === 'all') {
            dispatch(multiSelect({
                type: 'all',
                parentContainer: containerID,
                context: {
                    source: activeSourceContainer
                }
            }))
        }
    }, [activeSourceContainer, containerID, dispatch])
    const onSelect: SelectionSelectFn<PlacementSample> = useCallback((sample, selected) => {
        if (!activeSourceContainer) return
        if (containerID.name === null) {
            dispatch(multiSelect({
                forcedSelectedValue: selected,
                context: {
                    source: activeSourceContainer
                },
                type: 'sample-ids',
                parentContainer: containerID,
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
                parentContainer: containerID,
                samples: [{ sample, cell: { fromContainer: containerID, coordinates: sample.coordinates } }],
            }))
        }
    }, [activeSourceContainer, containerID, dispatch])
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
            rowKey={obj => `${obj.id}-${obj.coordinates}` }
            rowSelection={selectionProps}
            pagination={paginationProps}
        />
    )
}
export default PlacementSamplesTable
