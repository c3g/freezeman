import React, { useCallback, useEffect, useState } from "react";
import Cell from "./Cell"
import { NONE_STRING, PATTERN_STRING, SELECTED_STRING, cellSample } from "./LibraryTransferStep";

interface ContainerProps {
    containerType: string,
    columns: number,
    rows: number,
    samples: any,
    updateSample: (sample, containerType) => void,
    selectedSampleList: any,
    direction?: string,
    updateSampleGroup?: (sampleList) => void,
    pattern?: boolean,
}

const TransferContainer = ({ containerType, columns, rows, samples, direction, selectedSampleList, pattern, updateSample, updateSampleGroup }: ContainerProps) => {
    //boolean determining to see if the user is selecting
    const [isSelecting, setIsSelecting] = useState<boolean>(false)
    //preview cells so the user can see where the cells will be placed
    const [previewCells, setPreviewCells] = useState<any>({})

    const nextChar = useCallback((c: string) => {
        return String.fromCharCode(c.charCodeAt(0) + 1);
    }, [])

    const getDiff = useCallback((a, b) => {
        return (Number(a) - Number(b))
    }, [])

    const sortByCoordinate = useCallback((a, b) => {
        if (a.coordinates < b.coordinates) {
            return -1;
        } else if (a.coordinates > b.coordinates) {
            return 1;
        }
        return 0;
    }, [])

    const previewPlacePattern = useCallback((coordinates) => {

        // so to repeat the pattern but displace the cells, I take the most left cell and and the clicked cell, as how to transform the coords to the existing accordingly.
        // Iterate over all selected cells and take the difference of the most left column and the current cell
        // and add it to the clicked cell.
        // selected cells have coords ['a_1', 'a_3'], hovered cell to place is 'b_4'. Destination samples will become ['b_4, 'b_6']
        const cellsByCoordinate: any = []
        let preview = {}

        if (Object.keys(selectedSampleList).length > 0) {
            let mostLeftColumn = 12;
            Object.keys(selectedSampleList).forEach(id => {
                cellsByCoordinate.push({ id: id, type: selectedSampleList[id].type, coordinates: selectedSampleList[id].coordinates })
                const column = Number(selectedSampleList[id].coordinates.split('_')[1])
                mostLeftColumn = column <= mostLeftColumn ? column : mostLeftColumn
            })

            //sorting the sampleList by coordinates
            cellsByCoordinate.sort((sortByCoordinate))

            //coordinates of the cell clicked
            const placedCoordinate = coordinates.split('_')
            const placedColumn = Number(placedCoordinate[1])
            let transformedRow = placedCoordinate[0]
            let transformedColumn

            //row used to keep track whether to increase the transformed row
            let currentRow = cellsByCoordinate[0].coordinates.split('_')[0]
            //iterate through each selected sample and transforming the column and row to correspond to the one that was clicked
            cellsByCoordinate.forEach(value => {
                const coord = value.coordinates.split('_')

                //if row changes, increment row
                if (coord[0] != currentRow) {
                    currentRow = coord[0]
                    transformedRow = String.fromCharCode(transformedRow.charCodeAt(0) + 1)
                }

                //calculating the difference between this current coordinates and the most left column in this selection
                const difference = getDiff(Number(coord[1]), mostLeftColumn)
                //taking the current placedColumn and adding the differnece
                transformedColumn = placedColumn + difference
                preview[transformedRow + '_' + transformedColumn] = { id: value.id, type: PATTERN_STRING }
            })


            if (Object.keys(preview).length > 0)
                setPreviewCells(preview)

        }
    }, [previewCells, selectedSampleList, pattern])

    //allows to preview the cells that the group will go into, row or column
    const previewGroupPlacement = useCallback((coordinates) => {
        let preview = {}
        // const count = Object.keys(selectedSampleList).length
        const cells: any = Object.keys(selectedSampleList).map(id => {
            return ({ id: id, type: selectedSampleList[id].type, coordinates: selectedSampleList[id].coordinates })
        }).sort(sortByCoordinate)

        if (cells.length > 0 && direction) {
            //coordinates row and column is separated with '_'
            const coords = (coordinates.toString()).split('_')
            let row = String(coords[0])
            let col = Number(coords[1])
            for (let i = 0; i < cells.length; i++) {
                //creates row or column of cells that 
                if ((row.charCodeAt(0) < "I".charCodeAt(0)) && (col <= 12)) {
                    preview[row + "_" + col] = { id: cells[i].id, type: PATTERN_STRING }
                    if (direction == 'row') {
                        col += 1;
                    } else {
                        row = nextChar(row)
                    }
                }
            }
        }

        if (Object.keys(preview).length > 0)
            setPreviewCells(preview)
    }, [previewCells, direction, selectedSampleList])



    const onClick = useCallback((sample) => {
        //check to see if group placement is toggled so user can see where samples will be placed
        if ((direction || pattern) && updateSampleGroup && selectedSampleList && Object.keys(selectedSampleList).length > 0) {
            updateSampleGroup(previewCells)
        } else {
            //single sample selection/placement
            updateSample([sample], containerType)
            if (sample.id)
                setIsSelecting(!isSelecting)
        }
    }, [samples, isSelecting, direction, updateSampleGroup, previewCells, selectedSampleList])

    const onMouseHover = useCallback((sample: any) => {
        //add sample to selection
        if (isSelecting && sample.id) {
            updateSample([sample], containerType)
        } else {
            if (!pattern) {
                //update preview for group placement
                previewGroupPlacement(sample.coordinates)
            } else {
                //update preview for pattern placement
                previewPlacePattern(sample.coordinates)
            }
        }
    }, [isSelecting, direction, selectedSampleList, previewCells, pattern])


    //checks to see if sample exists at coordinates and returns sample
    const checkSamples = useCallback((coordinate) => {
        const removeLeadingZero = (value) => { return (value.split('_')[0] + '_' + parseFloat(value.split('_')[1])) }
        let tempSamples: cellSample = { ...samples }
        const id = Object.keys(tempSamples).find((id) => removeLeadingZero(tempSamples[id].coordinates) == coordinate) ?? null;
        let type = NONE_STRING
        if (id) {
            //if exists in selected list then the type is set to SELECTED_STRING
            if (selectedSampleList && selectedSampleList[id] && selectedSampleList[id].type == containerType)
                type = SELECTED_STRING
            else
                type = tempSamples[id].type
        }
        return id ? { id: id, type: type, name: tempSamples[id].name, sourceContainer: tempSamples[id].sourceContainer } : null
    }, [samples, selectedSampleList])

    const renderCells = useCallback(
        () => {
            let cells: any[] = [];
            let char = 'A';
            let coordinates = '';
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
            //renders each row with the corresponding row letter coordinates
            for (let i = 0; i < rows; i++) {
                let rowOfCells: React.ReactElement[] = []
                rowOfCells.push(
                    <div key={char} className={"cell"} style={{ backgroundColor: '#001529', color: 'white' }}>
                        {
                            char
                        }
                    </div>
                )
                //renders container cells
                for (let x = 1; x < columns + 1; x++) {
                    coordinates = char + "_" + (x);
                    rowOfCells.push(
                        <Cell key={coordinates}
                            onCellMouseLeave={() => setPreviewCells({})}
                            isSelecting={isSelecting}
                            onCellMouseOver={onMouseHover}
                            sample={checkSamples(coordinates)}
                            coordinates={coordinates}
                            outline={previewCells[coordinates] ? true : false}
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

    // console.log('samples', Object.keys(samples).length, containerType)
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