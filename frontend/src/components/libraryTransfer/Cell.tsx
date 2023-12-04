import React from "react"
import { useCallback } from "react"

interface CellProps {
    onClick: (e: any) => void,
    coordinate: string,
    sample: {
        sampleID: number,
        //3 types { selected, placed, used}
        type: string
    } | null
}

const Cell = ({ coordinate, onClick, sample }: CellProps) => {

    const onCellClick = () => {
        if (sample?.type != "placed"){
            onClick({ sampleID: sample?.sampleID ?? '', coordinate })
        }
    }

    const getColor = useCallback((sample) => {
        if (sample) {
            switch (sample.type) {
                case 'placed': {
                    return "grey"
                } case 'selected': {
                    return "#86ebc1"
                } default: {
                    return "blue"
                }
            }
        }
        return ''
    }, [sample, sample?.type])
    return (
        <>
            {
                <button
                    key={coordinate}
                    onClick={onCellClick}
                    style={{ borderRadius: 100, border: 'solid grey 1px', height: 20, width: 20, backgroundColor: getColor(sample) }} />

            }
        </>
    )
}

export default Cell