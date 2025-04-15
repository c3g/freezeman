import React, { useMemo, useState } from "react"
import { useCallback } from "react"
import './Placement.scss'
import { clickCell, onCellEnter, onCellExit } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Popover } from "antd"
import { selectActiveSourceContainer } from "../../modules/labworkSteps/selectors"
import { selectCell, selectPlacementState } from "../../modules/placement/selectors"
import { RootState } from "../../store"
import { CellIdentifier, ParentContainerIdentifier, SampleState } from "../../modules/placement/models"
import { PlacementClass } from "../../modules/placement/classes"

export interface CellProps {
    container: string
    coordinates: string
    cellSize: string
}

// component is used to represent individual cells in visualization of the placement transfer tab
const Cell = ({ container, coordinates, cellSize }: CellProps) => {
    const fromContainer = useMemo(() => ({ name: container }), [container])
    const dispatch = useAppDispatch()
    const activeSourceContainer = useAppSelector((state) => selectActiveSourceContainer(state))
    
    const cell = useAppSelector((state) => selectCell(state)({ fromContainer, coordinates }).state)
    const samplesByID = useAppSelector((state) => selectPlacementState(state).samples)

    const samples = useMemo(() => {
        const samples: SampleState[] = []
        for (const sampleID in cell.samples) {
            const sampleState = samplesByID[sampleID]
            if (sampleState) {
                samples.push(sampleState)
            }
        }
        return samples
    }, [cell.samples, samplesByID])

    const placedFrom = useMemo(() => {
        const placedFrom: (CellIdentifier | string)[] = []
        for (const sample of samples) {
            if (sample.fromCell?.fromContainer.name !== container || sample?.fromCell?.coordinates !== coordinates) {
                placedFrom.push(sample.fromCell
                    ? {
                        fromContainer: sample.fromCell?.fromContainer,
                        coordinates: sample.fromCell?.coordinates
                    }
                    : sample.containerName)
            }
        }
        return placedFrom
    }, [container, coordinates, samples])
    const placedAt: CellIdentifier[] = useMemo(() => {
        for (const sample of samples) {
            if (sample.fromCell?.fromContainer.name === container && sample?.fromCell?.coordinates === coordinates) {
                return sample.placedAt
            }
        }
        return []
    }, [container, coordinates, samples])

    const [popOverOpen, setPopOverOpen] = useState(false)

    const onClick = useCallback(() => {
        if (!activeSourceContainer) return
        dispatch(clickCell({
            fromContainer,
            coordinates,
            context: {
                source: activeSourceContainer
            }
        }))
    }, [activeSourceContainer, dispatch, fromContainer, coordinates])

    const onMouseEnter = useCallback(() => {
        if (!activeSourceContainer) return
        dispatch(onCellEnter({
            fromContainer,
            coordinates,
            context: {
                source: activeSourceContainer
            }
        }))
        setPopOverOpen(samples.length > 0)
    }, [activeSourceContainer, dispatch, fromContainer, coordinates, samples])

    const onMouseLeave = useCallback(() => {
        if (!activeSourceContainer) return
        dispatch(onCellExit({
            fromContainer,
            coordinates,
            context: {
                source: activeSourceContainer
            }
        }))
        setPopOverOpen(false)
    }, [activeSourceContainer, dispatch, fromContainer, coordinates])


    const cellColor = useAppSelector((state) => selectCellColor(state, { fromContainer, coordinates }, activeSourceContainer))

    return (
        <Popover
            content={<>
                <div>{`Sample(s): ${samples.map((s) => s.name).join(", ")}`}</div>
                <div>{`Coords: ${coordinates}`}</div>
                {placedFrom.length > 0 ? <div>{'From: '}{placedFrom.map((placedFrom) => typeof placedFrom === 'object' ? `${placedFrom.fromContainer.name}@${placedFrom.coordinates}` : placedFrom).join(", ")}</div> : undefined}
                {placedAt.length > 0 ? <div>{'At: '}{placedAt.map((placedAt) => `${placedAt.fromContainer.name}@${placedAt.coordinates}`).join(", ")}</div> : undefined}
            </>}
            destroyTooltipOnHide={{ keepParent: false }}
            open={popOverOpen}
        >
            <div
                className={cellSize}
                key={coordinates}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{ backgroundColor: cellColor }}
            >
                {cell.preview ? cell.preview : ''}
                {!cell.preview && placedAt.length > 0 ? placedAt.length : ''}
                {!cell.preview && placedFrom.length > 0 ? placedFrom.length : ''}
            </div>
        </Popover>
    )
}
export default Cell

function selectCellColor(state: RootState, cellID: CellIdentifier, sourceContainer?: ParentContainerIdentifier) {
    const placementState = selectPlacementState(state)
    const placement = new PlacementClass(placementState, undefined)
    const cell = placement.getCell(cellID)
    const placements = cell.getSamplePlacements(true)
    const existingSample = cell.findExistingSample()
    const selections = placements.filter((sample) => sample.selected)

    if (selections.length > 0) return "#86ebc1"
    if (cell.preview !== null) return placementState.error ? "pink" : "#74bbfc"
    const isSource = cellID.fromContainer.name === sourceContainer?.name
    if (
        (isSource && existingSample) ||
        (!isSource && placements.some((placement) => !existingSample || !placement.sample.sameSampleAs(existingSample)))
    ) return "#1890ff"
    if (!isSource && existingSample) return "grey"
    return "white"
}


