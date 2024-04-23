import React, { ReactNode, useCallback, useMemo } from "react"
import { Empty } from "antd"
import Cell from "./Cell"
import { multiSelect } from "../../modules/placement/reducers"
import { useAppDispatch, useAppSelector } from "../../hooks"

interface PlacementContainerProps {
    container: string
}

//component is used to visually represent the container, and its rows and columns of cells
const PlacementContainer = ({ container: containerName }: PlacementContainerProps) => {
    const dispatch = useAppDispatch()
    const container = useAppSelector((state) => state.placement.parentContainers[containerName])
    const [axisRow = [] as const, axisColumn = [] as const] = container?.spec ?? [[], []] as const
    const totalRow = axisRow?.length
    const totalColumn = axisColumn?.length

    const selectColumn = useCallback((column: number) => {
        return () => dispatch(multiSelect({
            parentContainer: containerName,
            type: 'column',
            column
        }))
    }, [containerName, dispatch])
    const selectRow = useCallback((row: number) => {
        return () => dispatch(multiSelect({
            parentContainer: containerName,
            type: 'row',
            row
        }))
    }, [containerName, dispatch])
    const selectAll = useCallback(() => {
        dispatch(multiSelect({
            parentContainer: containerName,
            type: 'all'
        }))
    }, [containerName, dispatch])

    const cells: ReactNode[] = useMemo(() => {
        const cells: ReactNode[] = []

        //renders header based on the number of columns provided to the component
        const headerCells: ReactNode[] = []
        const cellSize = totalColumn <= 12 ? "cell" : "tiny-cell"
        const columnLabelsWithPlus = ['+', ...axisColumn]
        for (let i = 0; i < totalColumn + 1; i++) {
            headerCells.push(
                <div key={'header_' + i} className={cellSize} style={{ backgroundColor: '#001529', color: 'white', cursor: 'grab' }} onClick={i !== 0 ? selectColumn(i - 1) : selectAll}>
                    {
                        columnLabelsWithPlus[i]
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
        for (let rowNumber = 0; rowNumber < totalRow; rowNumber++) {
            const rowOfCells: React.ReactElement[] = []
            rowOfCells.push(
                <div key={axisRow[rowNumber]} className={cellSize} style={{ backgroundColor: '#001529', color: 'white', cursor: 'grab' }} onClick={selectRow(rowNumber)}>
                    {
                        axisRow[rowNumber]
                    }
                </div>
            )
            //renders cells
            for (let colNumber = 0; colNumber < totalColumn; colNumber++) {
                const coordinates = axisRow[rowNumber] + axisColumn[colNumber]
                rowOfCells.push(
                    <Cell
                        key={coordinates}
                        container={containerName}
                        coordinates={coordinates}
                        cellSize={cellSize}
                    />
                )
            }
            //pushes rowOfCells to cell array
            cells.push(
                <div key={'row_' + axisRow[rowNumber]} className={"row"}>
                    {
                        rowOfCells
                    }
                </div>
            )
        }
        return cells
    }, [totalColumn, axisColumn, selectColumn, selectAll, totalRow, axisRow, selectRow, containerName])

    return (
        <>
            <div className={"transfer"}>
                {
                    (totalRow === 0 || totalColumn === 0) ?
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        :
                        cells
                }
            </div>
        </>
    )
}
export default PlacementContainer
