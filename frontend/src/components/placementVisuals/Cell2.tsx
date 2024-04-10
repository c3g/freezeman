import React from "react"
import { useCallback } from "react"
import { PLACED_STRING, SELECTED_STRING, sampleInfo } from "./PlacementTab"
import './Placement.scss'
import { CellState, PlacementOptions, clickCell, onCellEnter, onCellExit } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"

export interface CellProps {
    container: string
    coordinates: string
    cellSize: string
    placementOptions: PlacementOptions
}

// component is used to represent individual cells in visualization of the placement transfer tab
const Cell = ({ container, coordinates, cellSize, placementOptions }: CellProps) => {
    const dispatch = useAppDispatch()
    const cell = useAppSelector((state) => state.placement.parentContainers[container]?.cells[coordinates])

    const onClick = useCallback(() => {
        dispatch(clickCell({
            parentContainer: container,
            coordinates,
            placementOptions
        }))
    }, [container, coordinates, dispatch, placementOptions])

    const onMouseEnter = useCallback(() => {
        dispatch(onCellEnter({
            parentContainer: container,
            coordinates,
            placementOptions
        }))
    }, [container, coordinates, dispatch, placementOptions])

    const onMouseLeave = useCallback(() => {
        dispatch(onCellExit({
            parentContainer: container,
            coordinates,
            placementOptions
        }))
    }, [container, coordinates, dispatch, placementOptions])


    return (
        cell &&
        <div
            className={cellSize}
            key={coordinates}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{backgroundColor: getColor(cell)}}
        >
        </div>
    )
}

function getColor(cell: CellState) {
    if (cell.samplePlacedAt) {
        return "grey"
    }
    if (cell.samplePlacedFrom) {
        return "1890ff"
    }
    if (cell.selected) {
        return "#86ebc1"
    }
    if (cell.preview) {
        return "#74bbfc"
    }

    return cell.sample ? "1890ff" : "white"
}

export default Cell