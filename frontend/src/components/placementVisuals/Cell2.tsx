import React from "react"
import { useCallback } from "react"
import './Placement.scss'
import { CellState, PlacementOptions, clickCell, onCellEnter, onCellExit } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"

export interface CellProps {
    container: string
    coordinates: string
    cellSize: string
}

// component is used to represent individual cells in visualization of the placement transfer tab
const Cell = ({ container, coordinates, cellSize }: CellProps) => {
    const dispatch = useAppDispatch()
    const cell = useAppSelector((state) => state.placement.parentContainers[container]?.cells[coordinates])
    const activeSourceContainer = useAppSelector((state) => state.placement.activeSourceContainer)
    const activeDestinationContainer = useAppSelector((state) => state.placement.activeDestinationContainer)
    const isSource = container === activeSourceContainer
    const isDestination = container === activeDestinationContainer

    const onClick = useCallback(() => {
        dispatch(clickCell({
            parentContainer: container,
            coordinates,
        }))
    }, [container, coordinates, dispatch])

    const onMouseEnter = useCallback(() => {
        dispatch(onCellEnter({
            parentContainer: container,
            coordinates,
        }))
    }, [container, coordinates, dispatch])

    const onMouseLeave = useCallback(() => {
        dispatch(onCellExit({
            parentContainer: container,
            coordinates,
        }))
    }, [container, coordinates, dispatch])


    return (
        cell &&
        <div
            className={cellSize}
            key={coordinates}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{backgroundColor: getColor(cell, isSource, isDestination)}}
        >
        </div>
    )
}

function getColor(cell: CellState, isSource: boolean, isDestination: boolean) {
    if (cell.samplePlacedAt) {
        return "grey"
    }
    if (cell.samplePlacedFrom) {
        return "#1890ff"
    }
    if (cell.selected) {
        return "#86ebc1"
    }
    if (cell.preview) {
        return "#74bbfc"
    }
    if (cell.sample) {
        if (isDestination) {
            return "grey"
        }
        if (isSource) {
            return "#1890ff"
        }
    }

    return "white"
}

export default Cell