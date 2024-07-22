import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Space, Table, TableProps } from "antd";
import { ColumnsType, SelectionSelectFn, TableRowSelection } from "antd/lib/table/interface";
import { FMSId } from "../../models/fms_api_models";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { multiSelect } from "../../modules/placement/reducers";
import { selectSamplesByID } from "../../selectors";
import { fetchSamples } from "../../modules/cache/cache";
import { selectCell, selectContainer } from "../../modules/placement/selectors";
import { selectActiveDestinationContainer, selectActiveSourceContainer } from "../../modules/labworkSteps/selectors";
import store from "../../store";
import { comparePlacementSamples } from "../../utils/functions";

export interface PlacementSamplesTableProps {
    container: string | null
    showContainerColumn?: boolean
}

interface PlacementSample {
    id: FMSId
    selected: boolean
    name: string
    projectName: string
    parentContainerName: string | null
    coordinates: string | undefined
    placed: boolean
}

//component used to display and select samples in a table format for plate visualization placement
const PlacementSamplesTable = ({ container: containerName, showContainerColumn }: PlacementSamplesTableProps) => {
    const dispatch = useAppDispatch()
    // TODO: use sorted selected items instead when the field is defined in the labwork-refactor
    const container = useAppSelector((state) => selectContainer(state)({ name: containerName }))
    const samplesByID = useAppSelector(selectSamplesByID)
    const activeSourceContainer = useAppSelector(selectActiveSourceContainer)
    const activeDestinationContainer = useAppSelector(selectActiveDestinationContainer)
    const isSource = containerName === activeSourceContainer?.name
    const isDestination = containerName === activeDestinationContainer?.name

    const [samples, setSamples] = useState<PlacementSample[]>([])
    useEffect(() => {
        const missingSamples: FMSId[] = []
        const samples = container
            ? container.cells.reduce<PlacementSample[]>(
                (samples, cell) => {
                    if (!cell) return samples

                    let sample = cell.sample
                    let project = cell.projectName
                    let originalContainer = cell.parentContainerName

                    if (isDestination && cell.placedFrom) {
                        const otherCell = selectCell(store.getState())(cell.placedFrom)
                        if (!otherCell) {
                            console.error(`Cell at location '${cell.placedFrom.parentContainerName}@${cell.placedFrom.coordinates}' is not loaded`)
                            return samples
                        }
                        sample = otherCell.sample
                        project = otherCell.projectName
                        originalContainer = otherCell.parentContainerName
                    }

                    if (!sample) return samples

                    if (!samplesByID[sample]) {
                        missingSamples.push(sample)
                        return samples
                    }

                    const name = samplesByID[sample].name
                    samples.push({
                        id: sample,
                        selected: cell.selected,
                        name,
                        projectName: project,
                        parentContainerName: originalContainer,
                        coordinates: cell.coordinates,
                        placed: cell.placedAt !== null
                    })
                    return samples
                }, [])
            : []
        samples.sort((a, b) => comparePlacementSamples(a, b, container?.spec))
        setSamples(samples)
        if (missingSamples.length > 0)
            fetchSamples(missingSamples)
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
                parentContainer: containerName,
                context: {
                    source: activeSourceContainer?.name
                }
            }))
        }
    }, [activeSourceContainer?.name, containerName, dispatch])
    const onSelect: SelectionSelectFn<PlacementSample> = useCallback((sample, selected) => {
        dispatch(multiSelect({
            type: 'sample-ids',
            parentContainer: containerName,
            sampleIDs: [sample.id],
            forcedSelectedValue: selected,
            context: {
                source: activeSourceContainer?.name
            }
        }))
    }, [activeSourceContainer?.name, containerName, dispatch])
    const selectionProps: TableRowSelection<PlacementSample> = useMemo(() =>  ({
        selectedRowKeys,
        onChange,
        onSelect,
        getCheckboxProps: (sample) => ({
            disabled: isDestination && sample.parentContainerName === containerName
        })
    }), [selectedRowKeys, onChange, onSelect, isDestination, containerName])

    const paginationProps: NonNullable<TableProps<PlacementSample>['pagination']> = useMemo(() => ({
        showSizeChanger: true,
        showTotal(total, range) {
            return <>
                <>{`${range[0]}-${range[1]} of ${total} items.`}</>
                <>{' '}</>
                <>{`${selectedRowKeys.length} selected.`}</>
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
            dataSource={samples.filter(sample => !sample.placed).map(
            (sample) => 
                ({
                    ...sample,
                    parentContainerName: sample.parentContainerName ?? 'Tubes without parent' 
                })
            )}
            columns={columns}
            rowKey={obj => obj.id}
            rowSelection={selectionProps}
            pagination={paginationProps}
        />
    )
}
export default PlacementSamplesTable
