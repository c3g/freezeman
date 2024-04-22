import React, { Key, useCallback, useEffect, useMemo, useState } from "react"
import { Table } from "antd";
import { TableRowSelection } from "antd/lib/table/interface";
import { FMSId } from "../../models/fms_api_models";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { CellState, multiSelect } from "../../modules/placement/reducers";
import { selectSamplesByID } from "../../selectors";
import { batch } from "react-redux";
import { fetchSamples } from "../../modules/cache/cache";
export interface PlacementSamplesTableProps {
    sampleIDs: number[]
    container: string
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
const PlacementSamplesTable = ({ sampleIDs: labworkSelectedSamples, container: containerName }: PlacementSamplesTableProps) => {
    const dispatch = useAppDispatch()
    // TODO: use sorted selected items instead when the field is defined in the labwork-refactor
    const containers = useAppSelector((state) => state.placement.parentContainers)
    const container = containers[containerName]
    const samplesByID = useAppSelector(selectSamplesByID)

    type Samples = {
        sample: FMSId,
        selected: boolean
        name: string
        coordinates: string
    }[]
    const [samples, setSamples] = useState<Samples>([])
    useEffect(() => {
        const missingSamples: FMSId[] = []
        setSamples(
            container
                ? Object.entries(container?.cells).reduce((samples, [coordinates, cell]) => {
                    if (!cell) return samples

                    let sample: null | FMSId = null

                    if (container.type === 'source' && cell.sample && !cell.placedAt) {
                        sample = cell.sample
                    } else if (container.type === 'destination' && cell.placedFrom) {
                        const otherContainer = containers[cell.placedFrom.parentContainer]
                        if (!otherContainer) {
                            console.error(`Container '${cell.placedFrom.parentContainer}' is not loaded`)
                            return samples
                        }
                        const otherCell = otherContainer.cells[cell.placedFrom.coordinates]
                        if (!otherCell) {
                            console.error(`Cell at location '${cell.placedFrom.coordinates}@${cell.placedFrom.parentContainer}' is not loaded`)
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
                        coordinates
                    })
                    return samples
                }, [] as Samples)
                : []
        )
        if (missingSamples.length > 0)
            fetchSamples(missingSamples)
    }, [container, containers, samplesByID])

    const placementSelectedSamples = useMemo(
        () => container ? samples.reduce((sampleIDs, s) => {
            if (s.selected && s.sample) {
                sampleIDs.push(s.sample)
            }
            return sampleIDs
        }, [] as FMSId[]) : [],
        [container, samples]
    )

    const onChange = useCallback((keys: Key[]) => {
        batch(() => {
            dispatch(multiSelect({
                type: 'all',
                parentContainer: containerName,
                forcedSelectedValue: false
            }))
            dispatch(multiSelect({
                type: 'sample-ids',
                parentContainer: containerName,
                sampleIDs: keys.map((k) => Number(k)),
                forcedSelectedValue: true,
            }))
        })
    }, [containerName, dispatch])

    type SortedSample = {
        name: string,
        id: FMSId,
        coordinates: string
    }
    const sortedSamples: SortedSample[] = useMemo(() => {
        // const reverse = labworkSelectedSamples.reverse()
        const sortedSamples = [...samples]
        sortedSamples.sort((a, b) => {
            let orderA = 100
            let orderB = 100
            if (a.selected) orderA -= 10
            if (b.selected) orderB -= 10
            if (a.sample && b.sample) {
                if (a.sample > b.sample) orderB -= 5
                if (a.sample < b.sample) orderA -= 5
            }
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
    }, [samples])

    const selectionProps: TableRowSelection<SortedSample> = {
        selectedRowKeys: placementSelectedSamples,
        onChange,
    }

    return (
        <Table<SortedSample>
            dataSource={sortedSamples}
            columns={columns}
            rowKey={obj => obj.id}
            rowSelection={selectionProps}
        />
    )
}
export default PlacementSamplesTable