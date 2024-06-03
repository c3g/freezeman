import React, { useMemo, useState } from "react"
import { useCallback } from "react"
import './Placement.scss'
import { clickCell, onCellEnter, onCellExit } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Popover } from "antd"
import { selectActiveDestinationContainer, selectActiveSourceContainer } from "../../modules/labworkSteps/selectors"
import { selectCell } from "../../modules/placement/selectors"
import store from "../../store"
import { CellState } from "../../modules/placement/models"

export interface CellProps {
    container: string
    coordinates: string
    cellSize: string
}

// component is used to represent individual cells in visualization of the placement transfer tab
const Cell = ({ container: containerName, coordinates, cellSize }: CellProps) => {
    const dispatch = useAppDispatch()
    const cell = useAppSelector((state) => selectCell(state)({ parentContainerName: containerName, coordinates }))
    // cell is expected to be loaded before rendering cell component
    if (!cell) {
        throw new Error(`Cell not found for ${containerName}@${coordinates}`)
    }
    const placedFrom = useAppSelector((state) => cell.placedFrom && selectCell(state)(cell.placedFrom))
    // null for missing placedFrom, undefined shouldn't happen at this point
    if (placedFrom === undefined) {
        throw new Error(`Cell not find where it was placed from for ${containerName}@${coordinates}`)
    }
    // null for missing placedFrom, undefined shouldn't happen at this point
    const placedAt = useAppSelector((state) => cell.placedAt && selectCell(state)(cell.placedAt))
    if (placedAt === undefined) {
        throw new Error(`Cell not find where it was placed at for ${containerName}@${coordinates}`)
    }

    const sampleName = placedFrom?.name ?? cell.name

    const isSource = useAppSelector((state) => {
        const activeSourceContainer = selectActiveSourceContainer(state)
        return activeSourceContainer?.name === containerName
    })
    const isDestination = useAppSelector((state) => {
        const activeDestinationContainer = selectActiveDestinationContainer(state)
        return activeDestinationContainer?.name === containerName
    })
    const [popOverOpen, setPopOverOpen] = useState(false)
    const thereIsError = !!useAppSelector((state) => state.placement.error)

    const onClick = useCallback(() => {
        dispatch(clickCell({
            parentContainerName: containerName,
            coordinates,
            context: {
                source: selectActiveSourceContainer(store.getState())?.name
            }
        }))
    }, [containerName, coordinates, dispatch])

    const onMouseEnter = useCallback(() => {
        dispatch(onCellEnter({
            parentContainerName: containerName,
            coordinates,
            context: {
                source: selectActiveSourceContainer(store.getState())?.name
            }
        }))
        setPopOverOpen(sampleName !== '')
    }, [containerName, coordinates, dispatch, sampleName])

    const onMouseLeave = useCallback(() => {
        dispatch(onCellExit({
            parentContainerName: containerName,
            coordinates,
            context: {
                source: selectActiveSourceContainer(store.getState())?.name
            }
        }))
        setPopOverOpen(false)
    }, [containerName, coordinates, dispatch])


    return (
        cell &&
        <Popover
            content={<>
                <div>{`Sample: ${sampleName}`}</div>
                <div>{`Coordinates: ${cell.coordinates}`}</div>
                {placedFrom && <div>{`From: ${placedFrom.parentContainerName}@${placedFrom.coordinates}`}</div>}
                {placedAt && <div>{`At: ${placedAt.parentContainerName}@${placedAt.coordinates}`}</div>}
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
                style={{ backgroundColor: getColor(cell, isSource, isDestination, thereIsError) }}
            />
        </Popover>
    )
}

function getColor(cell: CellState, isSource: boolean, isDestination: boolean, thereIsError: boolean) {
    if (cell.selected) {
        return "#86ebc1"
    }
    if (cell.preview) {
        return cell.sample || cell.placedFrom || thereIsError ? "pink" : "#74bbfc"
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
