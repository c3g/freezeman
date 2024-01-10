import React, { useState } from "react"
import { useCallback } from "react"
import './Transfer.scss'
import { PLACED_STRING, SELECTED_STRING } from "./LibraryTransferStep"

interface CellProps {
    onCellClick: (e: any) => void,
    onCellMouseOver: (e: any) => void,
    onCellMouseLeave: () => void,
    coordinates: string,
    isSelecting: boolean,
    sample: {
        id: string,
        //3 types { selected, placed, none}
        type: string,
        name: string,
        sourceContainer?: string
    } | null,
    outline: boolean,
}

const Cell = ({ coordinates, onCellClick, sample, onCellMouseOver, onCellMouseLeave, isSelecting, outline }: CellProps) => {
    const [hover, setHover] = useState<boolean>(isSelecting)

    const onClick = useCallback(() => {
        if (sample?.type != PLACED_STRING) {
            onCellClick({ id: sample?.id, type: sample?.type, coordinates, name: sample?.name, sourceContainer: sample?.sourceContainer })
        }
        setHover(!hover)
    }, [sample, onCellClick, isSelecting, hover])

    const onMouseEnter = useCallback(() => {
        if (isSelecting) {
            setHover(true)
        }
    }, [isSelecting])

    const onMouseLeave = useCallback(() => {
        setHover(false)
        onCellMouseLeave()
    }, [])

    const onMouseOver = useCallback(() => onCellMouseOver({ ...sample, coordinates }), [sample, onCellMouseOver, onCellClick])
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
            className={'cell'}
            key={coordinates}
            onClick={onClick}
            onMouseOver={onMouseOver}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{ backgroundColor: outline ? 'rgb(24, 143, 255, 0.3)' : getColor(sample) }}
        >
            {sample?.id}
        </div>
    )
}

export default Cell