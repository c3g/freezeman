import React, { ReactNode, useCallback, useMemo, useState } from "react"
import { Empty } from "antd"
import Cell from "./Cell2"
import { PlacementOptions, multiSelect } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"

interface PlacementContainerProps {
    container: string
    placementOptions: PlacementOptions
}

function nextChar(c: string) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
}

function padColumn(col: number) {
    return (col < 10 ? col.toString().padStart(2, '0') : col)
}

//component is used to visually represent the container, and its rows and columns of cells
const PlacementContainer = ({ container: containerName, placementOptions }: PlacementContainerProps) => {
    const dispatch = useAppDispatch()
    const container = useAppSelector((state) => state.placement.parentContainers[containerName])
    const rows = container?.spec[0]?.length ?? 0
    const columns = container?.spec[1]?.length ?? 0

    const selectColumn = useCallback((column: number) => {
        return () => dispatch(multiSelect({
            container: containerName,
            type: 'column',
            column
        }))
    }, [containerName, dispatch])
    const selectRow = useCallback((row: number) => {
        return () => dispatch(multiSelect({
            container: containerName,
            type: 'row',
            row
        }))
    }, [containerName, dispatch])
    const selectAll = useCallback(() => {
        dispatch(multiSelect({
            container: containerName,
            type: 'all'
        }))
    }, [containerName, dispatch])

    const cells: ReactNode[] = useMemo(() => {
        const cells: ReactNode[] = []
        let char = 'A'
        let coordinates = ''
        //renders header based on the number of columns provided to the component
        const headerCells: ReactNode[] = []
        const cellSize = columns <= 12 ? "cell" : "tiny-cell"
        for (let i = 0; i < columns + 1; i++) {
            headerCells.push(
                <div key={'header_' + i} className={cellSize} style={{ backgroundColor: '#001529', color: 'white', cursor: 'grab' }} onClick={i !== 0 ? selectColumn(i - 1) : selectAll}>
                    {
                        i != 0 ? i : '+'
                    }
                </div>
            )
        }
        //adds number headers to total number of columns
        cells.push(<div key={'headers'} className={"header-row"}>
            {
                headerCells
            }
        </div>)
        //renders each row with the corresponding row letter 'A','B', etc.
        for (let i = 0; i < rows; i++) {
            const rowOfCells: React.ReactElement[] = []
            rowOfCells.push(
                <div key={char} className={cellSize} style={{ backgroundColor: '#001529', color: 'white', cursor: 'grab' }} onClick={selectRow(i)}>
                    {
                        char
                    }
                </div>
            )
            //renders cells
            for (let colNumber = 1; colNumber < columns + 1; colNumber++) {
                coordinates = char + "" + (padColumn(colNumber))
                rowOfCells.push(
                    <Cell
                        key={coordinates}
                        container={containerName}
                        coordinates={coordinates}
                        cellSize={cellSize}
                        placementOptions={placementOptions}
                    />
                )
            }
            //pushes rowOfCells to cell array
            cells.push(
                <div key={'row_' + char} className={"row"}>
                    {
                        rowOfCells
                    }
                </div>
            )
            //changes next character in the alphabet for next row
            char = nextChar(char)
        }
        return cells
    }, [columns, containerName, placementOptions, rows, selectAll, selectColumn, selectRow])

    return (
        <>
            <div className={"transfer"}>
                {
                    (rows === 0 && columns === 0) ?
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        :
                        cells
                }
            </div>
        </>
    )
}
export default PlacementContainer
