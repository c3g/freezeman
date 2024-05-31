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
import { comparePlacementSamples } from "../../utils/functions";
export interface PlacementSamplesTableProps {
    container: string | null
}
const columns = [
    // {
    //     title: 'ID',
    //     dataIndex: 'id',
    //     key: 'id',
    // },
    {
        title: 'Project',
        dataIndex: 'projectName',
        key: 'projectName',
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

    type PlacementSample = {
        id: FMSId
        selected: boolean
        name: string
        projectName: string
        coordinates: string | undefined
        placed: boolean
    }

    const [samples, setSamples] = useState<PlacementSample[]>([])
    useEffect(() => {
        const missingSamples: FMSId[] = []
        const samples = container
            ? container.cells.reduce<PlacementSample[]>(
                (samples, cell) => {
                    if (!cell) return samples

                    let sample: null | FMSId = null

                    if (isSource && cell.sample) {
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
                        id: sample,
                        selected: cell.selected,
                        name,
                        projectName: cell.projectName,
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
        getCheckboxProps(sample) {
            return {
                disabled: sample.placed
            }
        },
    }), [selectedRowKeys, onChange, onSelect])

    return (
        <Table<PlacementSample>
            dataSource={samples}
            columns={columns}
            rowKey={obj => obj.id}
            rowSelection={selectionProps}
            pagination={{ showSizeChanger: true }}
        />
    )
}
export default PlacementSamplesTable
