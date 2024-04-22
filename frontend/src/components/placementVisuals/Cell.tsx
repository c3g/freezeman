import React, { useState } from "react"
import { useCallback } from "react"
import './Placement.scss'
import { CellState, atLocations, clickCell, onCellEnter, onCellExit } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Popover } from "antd"
import { selectSamplesByID } from "../../selectors"

export interface CellProps {
    container: string
    coordinates: string
    cellSize: string
}

// component is used to represent individual cells in visualization of the placement transfer tab
const Cell = ({ container: containerName, coordinates, cellSize }: CellProps) => {
    const dispatch = useAppDispatch()
    const containerType = useAppSelector((state) => state.placement.parentContainers[containerName]?.type)
    const cell = useAppSelector((state) => state.placement.parentContainers[containerName]?.cells[coordinates])
    const sampleID = useAppSelector((state) => {
        if (cell?.sample) {
            return cell.sample
        }
        if (cell?.placedFrom) {
            return state.placement.parentContainers[cell.placedFrom.parentContainer]?.cells[cell.placedFrom.coordinates]?.sample ?? undefined
        }
    })
    const isSource = containerType === 'source'
    const isDestination = containerType === 'destination'
    const sample = useAppSelector((state) => sampleID !== undefined ? selectSamplesByID(state)[sampleID] : undefined)
    const [popOverOpen, setPopOverOpen] = useState(false)

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
        setPopOverOpen(true)
    }, [containerName, coordinates, dispatch])

    const onMouseLeave = useCallback(() => {
        dispatch(onCellExit({
            parentContainer: containerName,
            coordinates,
        }))
        setPopOverOpen(false)
    }, [containerName, coordinates, dispatch])


    return (
        cell &&
        <Popover
            content={<>
                <div>{`Sample: ${sample?.name ?? 'None'}`}</div>
                {cell.placedFrom && <div>{`From: ${atLocations(cell.placedFrom)}`}</div>}
                {cell.placedAt && <div>{`To: ${atLocations(cell.placedAt)}`}</div>}
            </>}
            destroyTooltipOnHide={true}
            open={popOverOpen}
            overlayStyle={{opacity: 0.9}}
        >
            <div
                className={cellSize}
                key={coordinates}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onFocus={() => {}}
                style={{ backgroundColor: getColor(cell, isSource, isDestination) }}
            >
                

            </div>
        </Popover>
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