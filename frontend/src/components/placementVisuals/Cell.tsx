import React, { useMemo, useState } from "react"
import { useCallback } from "react"
import './Placement.scss'
import { clickCell, onCellEnter, onCellExit } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Popover } from "antd"
import { selectActiveSourceContainer } from "../../modules/labworkSteps/selectors"
import { selectCell, selectPlacementState } from "../../modules/placement/selectors"
import { RootState } from "../../store"
import { CellIdentifier, ParentContainerIdentifier } from "../../modules/placement/models"
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

    const mySelectCell = (state: RootState) => selectCell(state)({ fromContainer, coordinates })
    const placedFrom = useAppSelector((state) => {
        const samplePlacements = mySelectCell(state).getSamplePlacements(false)
        if (samplePlacements.length > 0) {
            // TODO: handle multiple samples
            return samplePlacements[0].sample.fromCell?.state
        }
        return undefined
    })
    const placedAt = useAppSelector((state) => {
        const samplePlacements = mySelectCell(state).getSamplePlacements(false)
        if (samplePlacements.length > 0) {
            // TODO: handle multiple samples
            const placedAt = samplePlacements[0].sample.state.placedAt
            if (placedAt.length > 0) {
                return placedAt[0]
            } else {
                return undefined
            }
        }
        return undefined
    })
    const sample = useAppSelector((state) => {
        // TODO: handle multiple samples
        const cell = mySelectCell(state)
        const existingSample = cell.findExistingSample()
        if (existingSample) {
            return existingSample.state
        } else {
            const samples = cell.getSamples(false)
            if (samples.length > 0) {
                return samples[0].state
            } else {
                return undefined
            }
        }
    })

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
        setPopOverOpen(Boolean(sample && sample.name !== ''))
    }, [activeSourceContainer, dispatch, fromContainer, coordinates, sample])

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
                <div>{`Sample: ${sample?.name}`}</div>
                <div>{`Coords: ${coordinates}`}</div>
                {placedFrom && <div>{'From: '}{placedFrom.fromContainer.name}{'@'}{placedFrom.coordinates}</div>}
                {placedAt && <div>{`At: ${placedAt.fromContainer.name}@${placedAt.coordinates}`}</div>}
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
            />
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
    if (cell.preview) return placementState.error ? "pink" : "#74bbfc"
    const isSource = cellID.fromContainer.name === sourceContainer?.name
    if (
        (isSource && existingSample) ||
        (!isSource && placements.some((placement) => !existingSample || !placement.sample.sameSampleAs(existingSample)))
    ) return "#1890ff"
    if (!isSource && existingSample) return "grey"
    return "white"
}


