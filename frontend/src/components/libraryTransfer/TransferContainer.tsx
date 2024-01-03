import React, { useCallback, useState } from "react";
import Cell from "./Cell"
import { NONE_STRING, PATTERN_STRING, SELECTED_STRING, containerSample } from "./LibraryTransferStep";

interface ContainerProps {
    containerType: string,
    columns: number,
    rows: number,
    samples: any,
    updateSample: (sample, containerType) => void
    direction?: string,
    updateSampleGroup?: (sampleList) => void
    selectedSampleList: any,
    pattern?: boolean
}

const TransferContainer = ({ containerType, columns, rows, samples, updateSample, direction, updateSampleGroup, selectedSampleList, pattern }: ContainerProps) => {
    const [isSelecting, setIsSelecting] = useState<boolean>(false)
    const [previewCells, setPreviewCells] = useState<any>({})

    const nextChar = useCallback((c: string) => {
        return String.fromCharCode(c.charCodeAt(0) + 1);
    }, [])

    const previewPlacePattern = useCallback((coordinate) => {
        console.log(coordinate)
        // so to repeat the pattern but displace the cells, I take the most left cell and and the clicked cell, as how to transform the coords to the existing accordingly.
        // Iterate over all selected cells and take the difference of the most left column and the current cell
        // and add it to the clicked cell.
        // selected cells have coords ['a_1', 'a_3'], clicked cell to place is 'b_4'. Destination samples will become ['b_4, 'b_6']
        const sorted: any = []
        let tempPreviewCells = {}
        if (Object.keys(selectedSampleList).length > 0) {
            console.log(selectedSampleList)
            Object.keys(selectedSampleList).forEach(id => {
                sorted.push({ id: id, type: selectedSampleList[id].type, coordinate: selectedSampleList[id].coordinate })
            })
            //sorting the sampleList by coordinate
            sorted.sort((a, b) => {
                if (a.coordinate < b.coordinate) {
                    return -1;
                } else if (a.coordinate > b.coordinate) {
                    return 1;
                }
                return 0;
            })
            const getDiff = (a, b) => {
                return Math.abs(Number(a) - Number(b))
            }

            //cell that is click to translate the coords to
            const placed_coordinate = coordinate.split('_')
            //most left cell that is selected
            const left = sorted[0].coordinate.split('_')


            let difference = getDiff(placed_coordinate[1], left[1])
            const transformedColumn = Number(left[1]) + 1 * ((Number(placed_coordinate[1]) > Number(left[1])) ? difference : -difference)

            difference = getDiff(left[0].charCodeAt(0), placed_coordinate[0].charCodeAt(0))
            let transformedRow = String.fromCharCode(left[0].charCodeAt(0) + 1 * (placed_coordinate[0].charCodeAt(0) > left[0].charCodeAt(0) ? difference : -difference))



            let currentColumn = transformedColumn
            let currentRow = left[0]
            console.log(currentColumn, currentRow)
            //iterate through each selected sample and transforming the column and row to correspond to the one that was clicked
            sorted.forEach(value => {
                const coord = value.coordinate.split('_');

                //if row changes, increment row and reset column
                if (coord[0] != currentRow) {
                    transformedRow = String.fromCharCode(transformedRow.charCodeAt(0) + 1)
                    // currentColumn = transformedColumn
                }

                currentColumn = transformedColumn + getDiff(left[1], coord[1])
                tempPreviewCells[transformedRow + '_' + currentColumn] = { id: value.id, type: PATTERN_STRING }
                currentRow = value.coordinate.split('_')[0]
            })

            console.log(tempPreviewCells)
            if (Object.keys(tempPreviewCells).length > 0)
                setPreviewCells(tempPreviewCells)

        }
    }, [previewCells, selectedSampleList, pattern])

    //allows to preview the cells that the group will go into, row or column
    const previewGroupPlacement = useCallback((coordinate) => {
        let tempPreviewCells = {}
        const count = Object.keys(selectedSampleList).length
        if (count > 0 && direction) {
            //coordinate row and column is separated with '_'
            const coords = (coordinate.toString()).split('_')
            let row = String(coords[0])
            let col = Number(coords[1])
            for (let i = 0; i < count; i++) {
                //creates row or column of cells that 
                if ((row.charCodeAt(0) < "i".charCodeAt(0)) && (col <= 12)) {
                    tempPreviewCells[row + "_" + col] = { id: undefined, type: undefined }
                    if (direction == 'row') {
                        col += 1;
                    } else {
                        row = nextChar(row)
                    }
                }
            }
        } else {
            tempPreviewCells[coordinate] = { id: undefined, type: undefined }
        }

        if (Object.keys(tempPreviewCells).length > 0)
            setPreviewCells(tempPreviewCells)
    }, [previewCells, direction, selectedSampleList])



    const onClick = useCallback((sample) => {
        //check to see if group placement is toggled so user can see where samples will be placed
        if (direction && updateSampleGroup && selectedSampleList && Object.keys(selectedSampleList).length > 0) {
            updateSampleGroup(previewCells)
        } else if (pattern && updateSampleGroup && selectedSampleList && Object.keys(selectedSampleList).length > 0) {
            updateSampleGroup(previewCells)
        } else {
            //single sample selection/placement
            updateSample([sample], containerType)
            if (sample.id)
                setIsSelecting(!isSelecting)
        }
    }, [samples, isSelecting, direction, updateSampleGroup, previewCells, selectedSampleList])

    const onMouseHover = useCallback((sample: any) => {
        if (isSelecting && sample.id) {
            updateSample([sample], containerType)
        }
        //update preview for group placement every time mouse hovers over different cell
        if (!isSelecting && !sample.id && !pattern) {
            previewGroupPlacement(sample.coordinate)
        }
        if (!isSelecting && !sample.id && pattern) {
            previewPlacePattern(sample.coordinate)
        }
    }, [isSelecting, direction, selectedSampleList, previewCells, pattern])


    //checks to see if sample exists at coordinate and returns sample
    const checkSamples = useCallback((coordinate) => {
        let tempSamples: containerSample = { ...samples }
        const id = Object.keys(tempSamples).find((id) => tempSamples[id].coordinate == coordinate) ?? null;
        let type = NONE_STRING
        if (id) {
            //if exists in selected list then the type is set to SELECTED_STRING
            if (selectedSampleList && selectedSampleList[id] && selectedSampleList[id].type == containerType)
                type = SELECTED_STRING
            else
                type = tempSamples[id].type
        }
        return id ? { id: id, type: type } : null
    }, [samples, selectedSampleList])

    const renderCells = useCallback(() => {
        let cells: any[] = [];
        let char = 'a';
        let coordinate = '';
        //renders header based on the number of columns provided to the component
        let headerCells: React.ReactElement[] = []
        for (let i = 0; i < columns + 1; i++) {
            headerCells.push(
                <div key={'header_' + i} className={"header"}>
                    {
                        i != 0 ? i : ''
                    }
                </div>
            )
        }
        //adds number heards to total number of cells
        cells.push(<div key={'headers'} className={"header-row"}>
            {
                headerCells
            }
        </div>)
        //renders each row with the corresponding row letter coordinate
        for (let i = 0; i < rows; i++) {
            let rowOfCells: React.ReactElement[] = []
            rowOfCells.push(
                <div key={char} className={"cell"} style={{ backgroundColor: '#001529', color: 'white' }}>
                    {
                        char.toUpperCase()
                    }
                </div>
            )
            //renders container cells
            for (let x = 1; x < columns + 1; x++) {
                coordinate = char + "_" + (x);
                rowOfCells.push(
                    <Cell key={coordinate}
                        onCellMouseLeave={() => setPreviewCells({})}
                        isSelecting={isSelecting}
                        onCellMouseOver={onMouseHover}
                        sample={checkSamples(coordinate)}
                        coordinate={coordinate}
                        outline={previewCells[coordinate] ? true : false}
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
        return cells
    }, [samples, isSelecting, previewCells, direction, selectedSampleList, pattern])

    return (
        <>
            <div className={"transfer"}>
                {
                    renderCells()
                }
            </div>
        </>
    )
}
export default TransferContainer