import React, { Key, useCallback, useEffect, useMemo, useState } from "react"
import { Table } from "antd";
import { TableRowSelection } from "antd/lib/table/interface";
import { FMSId } from "../../models/fms_api_models";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { multiSelect } from "../../modules/placement/reducers";
import { selectSamplesByID } from "../../selectors";
import { batch } from "react-redux";
import { fetchSamples } from "../../modules/cache/cache";
export interface PlacementSamplesTableProps {
    stepID: number
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
const PlacementSamplesTable = ({ stepID, container: containerName }: PlacementSamplesTableProps) => {
    const dispatch = useAppDispatch()
    // TODO: use sorted selected items instead when the field is defined in the labwork-refactor
    const labworkSelectedSamples = useAppSelector((state) => state.labworkSteps.steps[stepID].selectedSamples.items)
    const containers = useAppSelector((state) => state.placement.parentContainers)
    const container = containers[containerName]
    const samplesByID = useAppSelector(selectSamplesByID)

    type LocalSample = {
        name: string,
        id: FMSId,
        coordinates: string
    }

    const [samples, setSamples] = useState<LocalSample[]>([])
    useEffect(() => {
        const missingSamples: FMSId[] = []
        setSamples(
            container
                ? Object.entries(container?.cells).reduce((samples, [coordinates, cell]) => {
                    if (!cell) return samples

                    let sample: null | FMSId = null

                    if (container.type === 'source' && cell.sample && !cell.samplePlacedAt) {
                        sample = cell.sample
                    } else if (container.type === 'destination' && cell.samplePlacedFrom) {
                        const otherContainer = containers[cell.samplePlacedFrom.parentContainer]
                        if (!otherContainer) {
                            console.error(`Container '${cell.samplePlacedFrom.parentContainer}' is not loaded`)
                            return samples
                        }
                        const otherCell = otherContainer.cells[cell.samplePlacedFrom.coordinates]
                        if (!otherCell) {
                            console.error(`Cell at location '${cell.samplePlacedFrom.coordinates}@${cell.samplePlacedFrom.parentContainer}' is not loaded`)
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
                        id: sample,
                        name: name,
                        coordinates
                    })
                    return samples
                }, [] as LocalSample[])
                : []
        )
        if (missingSamples.length > 0)
            fetchSamples(missingSamples)
    }, [container, containers, samplesByID])

    const placementSelectedSamples = useMemo(
        () => container ? samples.reduce((sampleIDs, s) => {
            const cell = container.cells[s.coordinates]
            if (cell && cell.selected) {
                sampleIDs.push(s.id)
            }
            return sampleIDs
        }, [] as FMSId[]) : [],
        [container, samples]
    )

    const onChange = useCallback((keys: Key[]) => {
        batch(() => {
            dispatch(multiSelect({
                type: 'all',
                container: containerName,
                forcedSelectedValue: false
            }))
            dispatch(multiSelect({
                type: 'sample-ids',
                container: containerName,
                sampleIDs: keys.map((k) => Number(k)),
                forcedSelectedValue: true,
            }))
        })
    }, [containerName, dispatch])

    const sortedSamples: LocalSample[] = useMemo(() => {
        // const reverse = labworkSelectedSamples.reverse()
        const sortedSamples = [...samples]
        const indices = Object.fromEntries(labworkSelectedSamples.map((id, index) => [id, index]))
        sortedSamples.sort((a, b) => {
            return indices[b.id] - indices[a.id]
        })
        return sortedSamples
    }, [samples, labworkSelectedSamples])

    const selectionProps: TableRowSelection<LocalSample> = {
        selectedRowKeys: placementSelectedSamples,
        onChange,
    }

    return (
        <Table<LocalSample>
            dataSource={sortedSamples}
            columns={columns}
            rowKey={obj => obj.id}
            rowSelection={selectionProps}
        />
    )
}
export default PlacementSamplesTable