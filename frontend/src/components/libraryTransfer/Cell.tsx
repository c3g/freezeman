import React, { useState } from "react"
import { useCallback } from "react"
import './Transfer.scss'

interface CellProps {
    onCellClick: (e: any) => void,
    onCellMouseOver: (e: any) => void,
    onCellMouseLeave: () => void,
    coordinate: string,
    isSelecting: boolean,
    sample: {
        id: string,
        //3 types { selected, placed, used}
        type: string
    } | null,
    outline: boolean,
}

const Cell = ({ coordinate, onCellClick, sample, onCellMouseOver, onCellMouseLeave, isSelecting, outline }: CellProps) => {
    const [hover, setHover] = useState<boolean>(isSelecting)

    const onClick = useCallback(() => {
        if (sample?.type != "placed") {
            onCellClick({ id: sample?.id, type: sample?.type, coordinate })
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

    const onMouseOver = useCallback(() => onCellMouseOver({ ...sample, coordinate }), [sample, onCellMouseOver, onCellClick])

    const getColor = useCallback((sample) => {
        if (sample) {
            switch (sample.type) {
                case 'placed': {
                    return "grey"
                } case 'selected': {
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
            key={coordinate}
            onClick={onClick}
            onMouseOver={onMouseOver}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{ backgroundColor: outline ? 'rgb(24, 143, 255, 0.3)' : getColor(sample)}}
        >
            {sample?.id}
        </div>
    )
}

export default Cell