import React, { useState } from "react"
import { useCallback } from "react"
import './Cell.scss'
interface CellProps {
    onClick: (e: any) => void,
    onMouseOver: (e: any) => void,
    coordinate: string,
    isSelecting: boolean,
    sample: {
        sampleID: number,
        //3 types { selected, placed, used}
        type: string
    } | null
}

const Cell = ({ coordinate, onClick, sample, onMouseOver, isSelecting }: CellProps) => {
    const [hover, setHover] = useState<boolean>(isSelecting)
    const onCellClick = useCallback(() => {
        if (sample?.type != "placed") {
            onClick({ sampleID: sample?.sampleID, type: sample?.type, coordinate })
        }
    }, [sample, isSelecting])

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
        <>
            {
                <button
                    className={'cell'}
                    key={coordinate}
                    onClick={() => {
                        onCellClick()
                        setHover(!hover)
                    }}
                    onMouseOver={() => onMouseOver({ ...sample, coordinate })}
                    onMouseEnter={() => {
                        if (isSelecting) {
                            setHover(true)
                        }
                    }}
                    onMouseLeave={() => setHover(false)}
                    style={{ borderRadius: 100, height: 20, width: 20, backgroundColor: getColor(sample), border: hover ? '2px solid darkblue' : '1px solid gray' }}
                />

            }
        </>
    )
}

export default Cell