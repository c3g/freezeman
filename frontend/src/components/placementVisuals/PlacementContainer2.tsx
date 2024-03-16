import React, { useCallback, useEffect, useRef } from "react";
import { CellSample } from "./models";

export interface PlacementContainerProps {
    updateSamples: (sampleList: any[], containerType: string, containerRows: number, containerColumns: number) => void,
    containerType: string,
    columns: number,
    rows: number,
    samples: CellSample,
    selectedSampleList: CellSample,
    direction?: string,
    pattern?: boolean,
}

export default function PlacementContainer({ containerType, columns, rows, samples, direction, selectedSampleList, pattern, updateSamples }: PlacementContainerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const ctx = canvasRef.current?.getContext('2d')
    const canvas = ctx?.canvas
    const rect = canvas?.getBoundingClientRect()

    const maxWidth = rect?.width ?? 1
    const maxHeight = rect?.height ?? 1

    const cellLength = Math.min(maxWidth / columns, maxHeight / rows)
    const width = cellLength * columns
    const height = cellLength * rows
    const radius = cellLength / 3

    const toIndexPosition = useCallback((x: number, y: number) => {
        return [ Math.floor(x / cellLength), Math.floor(y / cellLength) ]
    }, [cellLength])

    useEffect(() => {
        if (ctx) {
            for (let y = 0; y <= height; y += cellLength) {
                ctx.fillRect(0, y, cellLength * columns, 1)
            }
            for (let x = 0; x <= width; x += cellLength) {
                ctx.fillRect(x, 0, 1, cellLength * rows)
            }

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < columns; c++) {
                    const topLeftX = cellLength * c
                    const topLeftY = cellLength * r

                    ctx.beginPath()
                    const x = topLeftX + (cellLength / 2)
                    const y = topLeftY + (cellLength / 2)
                    ctx.arc(x, y, radius, 0, Math.PI * 2)
                    ctx.stroke()
                }
            }
        }
    }, [cellLength, columns, ctx, height, radius, rows, width])

    useEffect(() => {
        if (canvas) {
            canvas.addEventListener("click", (e) => {
                const offset = [e.offsetX, e.offsetY] as const
                const index = toIndexPosition(...offset)
                console.info(
                    offset,
                    index,
                    {
                        width,
                        height,
                        maxWidth,
                        maxHeight,
                        columns,
                        rows,
                        cellLength,
                        radius,
                    }
                )
            })
        }
    }, [canvas, cellLength, columns, height, maxHeight, maxWidth, radius, rows, toIndexPosition, width])

    return (<canvas ref={canvasRef}>

    </canvas>)
}