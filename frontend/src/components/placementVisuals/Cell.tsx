import React, { useMemo, useState } from "react"
import { useCallback } from "react"
import './Placement.scss'
import { clickCell, onCellEnter, onCellExit } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Popover } from "antd"
import { selectActiveSourceContainer, selectSourceContainers } from "../../modules/labworkSteps/selectors"
import { selectCell, selectPlacementState } from "../../modules/placement/selectors"
import { RootState } from "../../store"
import { CellIdentifier, SampleState } from "../../modules/placement/models"
import { PlacementClass } from "../../modules/placement/classes"

export interface CellProps {
    container: string
    coordinates: string
    cellSize: string
}

const EMPTY_CELL_COLOR = "#F2F3F4" // light grey
// assume maximum 11 source containers
const ACTIVE_CELL_COLORS = [
    "#4169E1",
    "#32CD32",
    "#FFD700",
    "#ac38acff",
    "#FF8C00",
    "#cc5490",
    "#008080",
    "#40E0D0",
    "#a04242ff",
    "#9b7a52ff",
    "#00ff00",
]
const INACTIVE_CELL_COLOR = "#808080" // grey
const SELECTION_CELL_COLOR = "#86EBC1" // light green
// assume maximum 11 source containers
const VALID_PREVIEW_CELL_COLORS = [
    "#939CED",
    "#90E182",
    "#FFE167",
    "#BD81B9",
    "#FFC183",
    "#E7A4C1",
    "#9DC4C3",
    "#98ECE1",
    "#D19999",
    "#CFC1A3",
    "#B3FFB3",
]
const INVALID_PREVIEW_CELL_COLOR = "#FFC0CB" // light pink
const ERROR_CELL_COLOR = "#FF0000" // red

// component is used to represent individual cells in visualization of the placement transfer tab
const Cell = ({ container, coordinates, cellSize }: CellProps) => {
    const fromContainer = React.useMemo(() => ({ name: container }), [container])
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
            if (!(sample.fromCell?.fromContainer.name === container && sample?.fromCell?.coordinates === coordinates)) {
                placedFrom.push(sample.fromCell
                    ? {
                        fromContainer: sample.fromCell.fromContainer,
                        coordinates: sample.fromCell.coordinates
                    }
                    : sample.containerName
                )
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


    const cellColor = useAppSelector((state) => selectCellColor(state, { fromContainer, coordinates }))

    let cellContent = ''
    if (cell.preview) {
        cellContent = cell.preview
    } else if (placedAt.length > 0) {
        cellContent = placedAt.length.toString()
    } else if (placedFrom.length > 0) {
        const cell = placedFrom[0]
        if (typeof cell === 'string') {
            cellContent = ''
        } else {
            cellContent = cell.coordinates
        }
    }

    return (
        <Popover
            content={<>
                <div>{`Sample(s): ${samples.map((s) => s.name).join(", ")}`}</div>
                <div>{`Coords: ${coordinates}`}</div>
                {placedFrom.length > 0 ? <div>{'From: '}{placedFrom.map((placedFrom) => typeof placedFrom === 'object'
                    ? `${placedFrom.fromContainer.name}@${placedFrom.coordinates}`
                    : placedFrom).join(", ")}</div> : undefined}
                {placedAt.length > 0 ? <div>{'At: '}{placedAt.map((placedAt) => `${placedAt.fromContainer.name}@${placedAt.coordinates}`).join(", ")}</div> : undefined}
            </>}
            destroyTooltipOnHide={true}
            open={popOverOpen}
        >
            <div
                className={cellSize}
                key={coordinates}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{ background: cell.preview ? cellColor : `radial-gradient(white 0%, ${cellColor} 50%, ${cellColor} 100%)` }}
            >
                {cellContent}
            </div>
        </Popover>
    )
}
export default Cell

function selectCellColor(state: RootState, cellID: CellIdentifier) {
    const placementState = selectPlacementState(state)
    const placement = new PlacementClass(placementState, undefined)
    const cell = placement.getCell(cellID)

    try {
        const placements = cell.getSamplePlacements(true)

        const sourceContainers = selectSourceContainers(state)
        const activeSourceContainer = selectActiveSourceContainer(state)
        if (!activeSourceContainer) throw new Error("No active source container when selecting cell color")

        // if no existing sample, no placed sample, and no preview, then it is empty
        if (placements.length === 0 && cell.getPreview() === null) return EMPTY_CELL_COLOR

        // is being preview?
        if (cell.getPreview() !== null) {
            const containerIndex = sourceContainers.findIndex((container) => container.name === activeSourceContainer.name)
            if (containerIndex === -1)
                throw new Error(`For preview cell, couldn't find container index for ${activeSourceContainer.name}`)
            if (containerIndex >= VALID_PREVIEW_CELL_COLORS.length)
                throw new Error(`Did not expect more than ${VALID_PREVIEW_CELL_COLORS.length} source containers for preview cell color`)
            return placementState.error ? INVALID_PREVIEW_CELL_COLOR : VALID_PREVIEW_CELL_COLORS[containerIndex]
        }

        // is selected?
        const selections = placements.filter((sample) => sample.getSelected())
        if (selections.length > 0) {
            return SELECTION_CELL_COLOR
        }

        const isSource = activeSourceContainer.name === cellID.fromContainer.name
        const existingSample = cell.findExistingSample()
        if (// source cell with existing sample
            (isSource && existingSample)
            ||
            // destination cell with a placed sample (and not already existing in that cell)
            (!isSource && placements.some((placement) => !existingSample || !placement.sample.sameSampleAs(existingSample.rawIdentifier())))
        ) {
            // assume only one sample per cell. placements also should include existing samples.
            const sample = placements[0].sample
            const containerSource = sample.getFromCell()?.getFromContainer()
            const containerIndex = sourceContainers.findIndex((container) => container.name === (
                // null is tubes without parent
                // now that i think about it, cell is never visible for tubes without parent
                containerSource ? containerSource.getName() : null
            ))
            if (containerIndex === -1)
                throw new Error(`For active cell, couldn't find container index for sample ${containerSource?.getName()}`)
            if (containerIndex >= ACTIVE_CELL_COLORS.length)
                throw new Error(`Did not expect more than ${ACTIVE_CELL_COLORS.length} source containers for active cell color`)
            return ACTIVE_CELL_COLORS[containerIndex]
        }

        // a cell should only be inactive if it's at the destination side with existing sample
        return INACTIVE_CELL_COLOR
    } catch (e) {
        console.info(cell.state, e)
        return ERROR_CELL_COLOR
    }
}


