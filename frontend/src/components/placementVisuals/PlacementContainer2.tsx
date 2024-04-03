import React, { useCallback, useMemo, useState } from "react"
import { Empty } from "antd"
import { useAppSelector } from "../../hooks"
import { PlacementContainerState } from "../../modules/placement/reducers"

interface PlacementContainerProps {
    containerName: string
}

//component is used to visually represent the container, and its rows and columns of cells
const PlacementContainer = ( { containerName }: PlacementContainerProps ) => {
    const parentContainerState: PlacementContainerState = useAppSelector((state) => state.placement[containerName])
    const columns = parentContainerState.spec[0]?.length ?? 0
    const rows = parentContainerState.spec[1]?.length ?? 0


    const cells: any[] = []
    let char = 'A'
    let coordinates = ''
    //renders header based on the number of columns provided to the component
    const headerCells: React.ReactElement[] = []
    const cellSize = columns <= 12 ? "cell" : "tiny-cell"
    for (let i = 0; i < columns + 1; i++) {
        headerCells.push(
            <div key={'header_' + i} className={cellSize} style={{ backgroundColor: '#001529', color: 'white', cursor: 'grab' }}>
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
        const charCopy = char.repeat(1)
        const rowOfCells: React.ReactElement[] = []
        rowOfCells.push(
            <div key={char} className={cellSize} style={{ backgroundColor: '#001529', color: 'white', cursor: 'grab' }}>
                {
                    char
                }
            </div>
        )
        //renders cells
        for (let colNumber = 1; colNumber < columns + 1; colNumber++) {
            coordinates = char + "" + (padColumn(colNumber))
            rowOfCells.push(
                <Cell key={coordinates}
                    onCellMouseLeave={() => setPreviewCells([])}
                    isSelecting={isSelecting}
                    useOver={onMouseHover}
                    sample={checkSamples(coordinates)}onCellMo
                    coordinates={coordinates}
                    outline={previewCells.find(sample => sample.coordinates == coordinates) ? true : false}
                    cellSize={cellSize}
                    onCellClick={isSelecting ? () => setIsSelecting(false) : onClick} />
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
