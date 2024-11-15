import React, { useMemo, useState } from "react"
import { useCallback } from "react"
import './Placement.scss'
import { clickCell, onCellEnter, onCellExit } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Popover } from "antd"
import { selectActiveDestinationContainer, selectActiveSourceContainer } from "../../modules/labworkSteps/selectors"
import store from "../../store"
import { CellState, PlacementSample, SampleDetail } from "../../modules/placement/models"
import { selectCell, selectPlacementSamples, selectOriginalSampleDetailOfCell, selectSampleDetails } from "../../modules/placement/selectors"

export interface CellProps {
    container: string
    coordinates: string
    cellSize: string
}

// component is used to represent individual cells in visualization of the placement transfer tab
const Cell = ({ container: containerName, coordinates, cellSize }: CellProps) => {
    const dispatch = useAppDispatch()
    const cell = useAppSelector((state) => selectCell(state, containerName, coordinates))

    const placementSamples = useAppSelector((state) => selectPlacementSamples(state, containerName))
    const sampleIDs = useMemo(() => placementSamples.map(sample => sample.id), [placementSamples])
    const sampleDetails = useAppSelector((state) => selectSampleDetails(state, sampleIDs))
    const originalSample = useAppSelector((state) => selectOriginalSampleDetailOfCell(state, containerName, coordinates))

    const sourceContainer = useAppSelector((state) => selectActiveSourceContainer(state))
    const isSource = sourceContainer?.name === containerName
    const destinationContainer = useAppSelector((state) => selectActiveDestinationContainer(state))
    const isDestination = destinationContainer?.name === containerName

    const [popOverOpen, setPopOverOpen] = useState(false)
    const thereIsError = !!useAppSelector((state) => state.placement.error)

    const onClick = useCallback(() => {
        dispatch(clickCell({
            parentContainer: containerName,
            coordinates,
            context: {
                sourceParentContainer: sourceContainer?.name,
                destinationParentContainer: destinationContainer?.name
            }
        }))
    }, [containerName, coordinates, destinationContainer?.name, dispatch, sourceContainer?.name])

    const onMouseEnter = useCallback(() => {
        dispatch(onCellEnter({
            parentContainer: containerName,
            coordinates,
            context: {
                sourceParentContainer: sourceContainer?.name,
                destinationParentContainer: destinationContainer?.name
            }
        }))
        setPopOverOpen(sampleDetails.length > 0)
    }, [containerName, coordinates, destinationContainer?.name, dispatch, sampleDetails.length, sourceContainer?.name])

    const onMouseLeave = useCallback(() => {
        dispatch(onCellExit({
            parentContainer: containerName,
            coordinates,
            context: {
                sourceParentContainer: sourceContainer?.name,
                destinationParentContainer: destinationContainer?.name
            }
        }))
        setPopOverOpen(false)
    }, [containerName, coordinates, destinationContainer?.name, dispatch, sourceContainer?.name])


    return (
        cell &&
        <Popover
            content={<>
                <div>{`Samples: ${sampleDetails.map((s) => s.name).join(", ")}`}</div>
                <div>{`Original Sample: ${originalSample?.name}`}</div>
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
                style={{ backgroundColor: getColor(cell, placementSamples, isSource, isDestination, thereIsError) }}
            />
        </Popover>
    )
}

function getColor(cell: CellState, samples: (PlacementSample | SampleDetail)[], isSource: boolean, isDestination: boolean, thereIsError: boolean) {
    if (samples.some(sample => sample.selected)) {
        return "#86ebc1"
    }
    if (cell.preview) {
        return thereIsError ? "pink" : "#74bbfc"
    }

    if (samples.length > 0) {
        return "grey"
    }

    return "white"
}

export default Cell
