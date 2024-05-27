import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Table } from "antd";
import { SelectionSelectFn, TableRowSelection } from "antd/lib/table/interface";
import { FMSId } from "../../models/fms_api_models";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { multiSelect } from "../../modules/placement/reducers";
import { selectSamplesByID } from "../../selectors";
import { fetchSamples } from "../../modules/cache/cache";
import { selectCell, selectContainer } from "../../modules/placement/selectors";
import { selectActiveDestinationContainer, selectActiveSourceContainer } from "../../modules/labworkSteps/selectors";
import store from "../../store";
import { compareArray, coordinatesToOffsets } from "../../utils/functions";
export interface PlacementSamplesTableProps {
    container: string | null
}
const columns = [
    {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
    },
    {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
    },
    {
        title: 'coordinates',
        dataIndex: 'coordinates',
        key: 'coordinates',
    },
];
//component used to display and select samples in a table format for plate visualization placement
const PlacementSamplesTable = ({ container: containerName }: PlacementSamplesTableProps) => {
    const dispatch = useAppDispatch()
    // TODO: use sorted selected items instead when the field is defined in the labwork-refactor
    const container = useAppSelector((state) => selectContainer(state)({ name: containerName }))
    const samplesByID = useAppSelector(selectSamplesByID)
    const activeSourceContainer = useAppSelector(selectActiveSourceContainer)
    const activeDestinationContainer = useAppSelector(selectActiveDestinationContainer)
    const isSource = containerName === activeSourceContainer?.name
    const isDestination = containerName === activeDestinationContainer?.name

    type Samples = {
        sample: FMSId,
        selected: boolean
        name: string
        coordinates: string | undefined
    }[]
    const [samples, setSamples] = useState<Samples>([])
    useEffect(() => {
        const missingSamples: FMSId[] = []
        setSamples(
            container
                ? container.cells.reduce((samples, cell) => {
                    if (!cell) return samples

                    let sample: null | FMSId = null

                    if (isSource && cell.sample && !cell.placedAt) {
                        sample = cell.sample
                    } else if (isDestination && cell.placedFrom) {
                        const otherCell = selectCell(store.getState())(cell.placedFrom)
                        if (!otherCell) {
                            console.error(`Cell at location '${cell.placedFrom.parentContainerName}@${cell.placedFrom.coordinates}' is not loaded`)
                            return samples
                        }
                        sample = otherCell.sample
                    }

                    if (!sample) return samples

                    if (!samplesByID[sample]) {
                        missingSamples.push(sample)
                        return samples
                    }

                    const name = samplesByID[sample].name
                    samples.push({
                        sample,
                        selected: cell.selected,
                        name,
                        coordinates: cell.coordinates,
                    })
                    return samples
                }, [] as Samples)
                : []
        )
        if (missingSamples.length > 0)
            fetchSamples(missingSamples)
    }, [container, isDestination, isSource, samplesByID])

    const placementSelectedSamples = useMemo(
        () => container ? samples.reduce((sampleIDs, s) => {
            if (s.selected && s.sample) {
                sampleIDs.push(s.sample)
            }
            return sampleIDs
        }, [] as FMSId[]) : [],
        [container, samples]
    )

    const onChange: NonNullable<TableRowSelection<SortedSample>['onChange']> = useCallback((keys, selectedRows, info) => {
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

    const onSelect: SelectionSelectFn<SortedSample> = useCallback((record, selected) => {
        dispatch(multiSelect({
            type: 'sample-ids',
            parentContainer: containerName,
            sampleIDs: [record.id],
            forcedSelectedValue: selected,
            context: {
                source: activeSourceContainer?.name
            }
        }))
    }, [activeSourceContainer?.name, containerName, dispatch])

    type SortedSample = {
        name: string,
        id: FMSId,
        coordinates: string | undefined
    }
    const sortedSamples: SortedSample[] = useMemo(() => {
        // const reverse = labworkSelectedSamples.reverse()
        const sortedSamples = [...samples]
        sortedSamples.sort((a, b) => {
            const MAX = 128

            let orderA = MAX
            let orderB = MAX

            if (a.selected) orderA -= MAX/2
            if (b.selected) orderB -= MAX/2

            if (container && a.coordinates && b.coordinates) {
                const aOffsets = coordinatesToOffsets(container.spec, a.coordinates)
                const bOffsets = coordinatesToOffsets(container.spec, b.coordinates)
                const arrayComparison = compareArray(aOffsets.reverse(), bOffsets.reverse())
                if (arrayComparison > 0) orderB -= MAX/4
                if (arrayComparison < 0) orderA -= MAX/4
            }

            if (a.name > b.name) orderB -= MAX/8
            if (a.name < b.name) orderA -= MAX/8

            return orderA - orderB
        })
        return sortedSamples.reduce((sortedSamples, s) => {
            // s.sample also represents a sample from another container
            if (s.sample) {
                sortedSamples.push({
                    name: s.name,
                    id: s.sample,
                    coordinates: s.coordinates
                })
            }
            return sortedSamples
        }, [] as SortedSample[])
    }, [samples, container])

    const selectionProps: TableRowSelection<SortedSample> = {
        selectedRowKeys: placementSelectedSamples,
        onChange,
        onSelect,
    }

    return (
        <Table<SortedSample>
            dataSource={sortedSamples}
            columns={columns}
            rowKey={obj => obj.id}
            rowSelection={selectionProps}
	        pagination={{ showSizeChanger: true }}
        />
    )
}
export default PlacementSamplesTable
