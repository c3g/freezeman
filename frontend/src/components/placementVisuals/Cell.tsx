import React, { useMemo, useState } from "react"
import { useCallback } from "react"
import './Placement.scss'
import { clickCell, onCellEnter, onCellExit } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Popover } from "antd"
import { selectActiveDestinationContainer, selectActiveSourceContainer } from "../../modules/labworkSteps/selectors"
import { selectCell } from "../../modules/placement/selectors"
import { RootState } from "../../store"
import { CellState } from "../../modules/placement/models"

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
            return samplePlacements[0].sample.placedAt[0]?.state
        }
        return undefined
    })
    const sample = useAppSelector((state) => {
        const cell = mySelectCell(state)
        const existingSample = cell.findExistingSample()
        if (existingSample) {
            return existingSample.state
        } else {
            return cell.getSamples(false)[0]?.state
        }
    })


    const isSource = activeSourceContainer?.name === fromContainer.name
    const isDestination = useAppSelector((state) => {
        const activeDestinationContainer = selectActiveDestinationContainer(state)
        return activeDestinationContainer?.name === fromContainer.name
    })
    const [popOverOpen, setPopOverOpen] = useState(false)
    const thereIsError = !!useAppSelector((state) => state.placement.error)

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
        setPopOverOpen(sample.name !== '')
    }, [activeSourceContainer, dispatch, fromContainer, coordinates, sample.name])

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


    return (
        <Popover
            content={<>
                <div>{`Sample: ${sample.name}`}</div>
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
