import React from "react"
import { useCallback } from "react"
import { PLACED_STRING, SELECTED_STRING, sampleInfo } from "./PlacementTab"
import './Placement.scss'

interface CellProps {
    onCellClick: (e: any) => void,
    onCellMouseOver: (e: any) => void,
    onCellMouseLeave: () => void,
    sample?: sampleInfo,
    coordinates: string,
    isSelecting: boolean,
    outline: boolean,
    cellSize: string
}

// component is used to represent individual cells in visualization of the placement transfer tab
const Cell = ({ onCellClick, sample, onCellMouseOver, onCellMouseLeave, isSelecting, outline, cellSize, coordinates }: CellProps) => {

    const onClick = useCallback(() => {
        if (sample?.type != PLACED_STRING) {
            onCellClick(sample ? { ...sample } : { coordinates: coordinates })
        }
    }, [sample, onCellClick, isSelecting])

    const onMouseEnter = useCallback(() => {
        if (isSelecting) {
        }
    }, [isSelecting])

    const onMouseLeave = useCallback(() => {
        onCellMouseLeave()
    }, [])

    const onMouseOver = useCallback(() => onCellMouseOver({ ...sample, coordinates }), [sample, onCellMouseOver, onCellClick])
    //returns appropriate color depending on the type of cell it represents. If a sample is in cell or not, also if it is selected, placed, or neutral.
    const getColor = useCallback((sample) => {
        if (sample) {
            switch (sample.type) {
                case PLACED_STRING: {
                    return "grey"
                } case SELECTED_STRING: {
                    return "#86ebc1"
                } default: {
                    return "#1890ff"
                }
            }
        }
        return ''
    }, [sample, sample?.type])

    return (
        <div
            className={cellSize}
            key={coordinates}
            onClick={onClick}
            onMouseOver={onMouseOver}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{backgroundColor: outline ? 'rgb(24, 143, 255, 0.3)' : getColor(sample)}}
        >
        </div>
    )
}

export default Cell