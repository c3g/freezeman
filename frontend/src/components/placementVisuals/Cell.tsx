import React from "react"
import { useCallback } from "react"
import './Placement.scss'
import { CellState, atLocations, clickCell, onCellEnter, onCellExit } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Tooltip } from "antd"

export interface CellProps {
    container: string
    coordinates: string
    cellSize: string
}

// component is used to represent individual cells in visualization of the placement transfer tab
const Cell = ({ container: containerName, coordinates, cellSize }: CellProps) => {
    const dispatch = useAppDispatch()
    const container = useAppSelector((state) => state.placement.parentContainers[containerName])
    const cell = useAppSelector((state) => state.placement.parentContainers[containerName]?.cells[coordinates])
    const sampleID = useAppSelector((state) => cell?.sample ?? (cell?.placedFrom ? state.placement.parentContainers[cell.placedFrom.parentContainer]?.cells[cell.placedFrom.coordinates]?.sample ?? undefined : undefined))
    const isSource = container?.type === 'source'
    const isDestination = container?.type === 'destination'

    const onClick = useCallback(() => {
        dispatch(clickCell({
            parentContainer: containerName,
            coordinates,
        }))
    }, [containerName, coordinates, dispatch])

    const onMouseEnter = useCallback(() => {
        dispatch(onCellEnter({
            parentContainer: containerName,
            coordinates,
        }))
    }, [containerName, coordinates, dispatch])

    const onMouseLeave = useCallback(() => {
        dispatch(onCellExit({
            parentContainer: containerName,
            coordinates,
        }))
    }, [containerName, coordinates, dispatch])


    return (
        cell &&
        <Tooltip
            title={<>
                <div>{`Sample: ${sampleID ?? 'None'}`}</div>
                {cell.placedFrom && <div>{`From: ${atLocations(cell.placedFrom)}`}</div>}
                {cell.placedAt && <div>{`To: ${atLocations(cell.placedAt)}`}</div>}
            </>}
            destroyTooltipOnHide={true}
            mouseEnterDelay={0.5}
            mouseLeaveDelay={0.1}
        >
            <div
                className={cellSize}
                key={coordinates}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{ backgroundColor: getColor(cell, isSource, isDestination) }}
            >
                

            </div>
        </Tooltip>
    )
}

function getColor(cell: CellState, isSource: boolean, isDestination: boolean) {
    if (cell.selected) {
        return "#86ebc1"
    }
    if (cell.preview) {
        return cell.sample || cell.placedFrom ? "pink" : "#74bbfc"
    }

    if (isSource && cell.sample) {
        return cell.placedAt ? "grey" : "#1890ff"
    }

    if (isDestination && cell.sample) {
        return "grey"
    }
    if (isDestination && cell.placedFrom) {
        return "#1890ff"
    }

    return "white"
}

export default Cell