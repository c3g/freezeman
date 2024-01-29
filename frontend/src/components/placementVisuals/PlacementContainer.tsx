import React, { useCallback, useState } from "react";
import { DESTINATION_STRING, NONE_STRING, PREVIEW_STRING, SELECTED_STRING, sampleInfo } from "./PlacementTab";
import Cell from "./Cell"

interface PlacementContainerProps {
    updateSamples: (sampleList, containerType) => void,
    containerType: string,
    columns: number,
    rows: number,
    samples: any,
    selectedSampleList: any,
    direction?: string,
    pattern?: boolean,
}

//component is used to visually represent the container, and its rows and columns of cells
const PlacementContainer = ({ containerType, columns, rows, samples, direction, selectedSampleList, pattern, updateSamples }: PlacementContainerProps) => {

    //boolean determining to see if the user is selecting
    const [isSelecting, setIsSelecting] = useState<boolean>(false)

    //preview cells so the user can see where the cells will be placed
    const [previewCells, setPreviewCells] = useState<any[]>([])

    const nextChar = useCallback((c: string) => {
        return String.fromCharCode(c.charCodeAt(0) + 1);
    }, [])

    const padColumn = useCallback((col) => {
        return (col < 10 ? col.toString().padStart(2, '0') : col)
    }, [])

    const getRowFromCoordinates = useCallback((coordinates) => {
        return coordinates.substring(0, 1)
    }, [])

    const getColumnFromCoordinates = useCallback((coordinates) => {
        return Number(coordinates.substring(1))
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

    //allows to preview the cells that the pattern of selected samples will go into
    const previewPlacePattern = useCallback((coordinates) => {

        // so to repeat the pattern but displace the cells, I use the most left cell in the selected grouping and where it is to be placed (clicked cell) to calculate and transform the coords to the existing accordingly.
        // Iterate over all selected cells and take the difference of the most left column and the current cell
        // and add the difference to the where it should be placed
        // selected cells have coords ['a_1', 'a_3'], hovered cell to place is 'b_4'. Destination samples will become ['b_4, 'b_6']
        const cellsByCoordinate: any = []
        let preview: sampleInfo[] = []

        let mostLeftColumn = columns;
        //iterates over the selected samples to find the most left column of them
        if (Object.keys(selectedSampleList).length > 0) {
            Object.keys(selectedSampleList).forEach(id => {
                cellsByCoordinate.push({ id: id, type: selectedSampleList[id].type, coordinates: selectedSampleList[id].coordinates })
                const coords = selectedSampleList[id].coordinates
                const column = (getColumnFromCoordinates(coords))
                mostLeftColumn = column <= mostLeftColumn ? column : mostLeftColumn
            })


            //sorting the sampleList by coordinates
            cellsByCoordinate.sort((sortByCoordinate))

            //getting coordinates of the clicked cell
            const placedColumn = getColumnFromCoordinates(coordinates)
            let transformedRow = getRowFromCoordinates(coordinates)
            let transformedColumn


            //row used to keep track whether to increase the transformed row
            let currentRow = getRowFromCoordinates(cellsByCoordinate[0].coordinates)
            //iterate through each selected sample and transforming the column and row to correspond to the one that was clicked
            cellsByCoordinate.forEach(value => {
                const coord = value.coordinates
                const row = getRowFromCoordinates(coord)
                //if sample is in a different row than from the previous, increment row
                if (row != currentRow) {
                    currentRow = row
                    transformedRow = String.fromCharCode(transformedRow.charCodeAt(0) + 1)
                }
                //calculating the difference between the current cell's coordinate and the most left column in this selected samples group
                const difference = getDiff(getColumnFromCoordinates(coord), mostLeftColumn)

                //taking the current placedColumn and adding the differnece
                transformedColumn = placedColumn + difference
                preview.push({ id: value.id, type: PREVIEW_STRING, coordinates: transformedRow + padColumn(transformedColumn) })
            })

            if (preview.length > 0)
                setPreviewCells(preview)

        }
    }, [previewCells, selectedSampleList, pattern])

    //allows to preview the cells that the group of selected samples will go into
    const previewGroupPlacement = useCallback((coordinates) => {
        let preview: sampleInfo[] = []

        //sorts list of cells by coordinate
        const cells: any = Object.keys(selectedSampleList).map(id => {
            return ({ id: id, type: selectedSampleList[id].type, coordinates: selectedSampleList[id].coordinates })
        }).sort(sortByCoordinate)


        if (cells.length > 0) {
            let row = getRowFromCoordinates(coordinates)
            let col = getColumnFromCoordinates(coordinates)
            for (let i = 0; i < cells.length; i++) {
                preview.push({ id: cells[i].id, type: PREVIEW_STRING, coordinates: row + padColumn(col) })
                //increments row or column based on if the user wants to place new group in a column or row
                if (direction == 'row') {
                    col += 1;
                } else {
                    row = nextChar(row)
                }
            }
        }

        if (preview.length > 0)
            setPreviewCells(preview)
    }, [previewCells, direction, selectedSampleList])



    const onClick = useCallback((sample) => {
        if ((!(previewCells.length > 0 && !isSelecting && sample.id)))
            updateSamples([...previewCells, sample], containerType)
        if (sample.id)
            setIsSelecting(!isSelecting)
    }, [samples, isSelecting, direction, updateSamples, previewCells, selectedSampleList])

    const onMouseHover = useCallback((sample: any) => {
        //add sample to selection
        if (isSelecting && sample.id) {
            updateSamples([...previewCells, sample], containerType)
        } else {
            if (containerType == DESTINATION_STRING && !sample.id) {
                if (!pattern) {
                    //update preview for group placement
                    previewGroupPlacement(sample.coordinates)
                } else {
                    //update preview for pattern placement
                    previewPlacePattern(sample.coordinates)
                }
            }
        }
    }, [isSelecting, previewCells, direction, selectedSampleList, pattern, containerType])


    //used in render to check to see if samples exist at that coordinate and returns sample
    const checkSamples = useCallback((coordinate) => {

        const id = Object.keys(samples).find((id) => (samples[id].coordinates) == coordinate) ?? null;
        let type = NONE_STRING
        if (id) {
            //if exists in selected list then the type is set to SELECTED_STRING
            if (selectedSampleList && selectedSampleList[id] && selectedSampleList[id].type == containerType)
                type = SELECTED_STRING
            else
                type = samples[id].type
        }
        return id ? { ...samples[id], id: parseInt(id), type: type } : undefined
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
            //adds number headers to total number of columns
            cells.push(<div key={'headers'} className={"header-row"}>
                {
                    headerCells
                }
            </div>)
            //renders each row with the corresponding row letter 'A','B', etc.
            for (let i = 0; i < rows; i++) {
                let rowOfCells: React.ReactElement[] = []
                rowOfCells.push(
                    <div key={char} className={"cell"} style={{ backgroundColor: '#001529', color: 'white' }}>
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
                            onCellMouseOver={onMouseHover}
                            sample={checkSamples(coordinates)}
                            coordinates={coordinates}
                            outline={previewCells.find(sample => sample.coordinates == coordinates) ? true : false}
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
            <div className={"transfer"} style={
                { 
                    cursor: isSelecting ? 'crosshair' : 'auto',
                }
            }>
                {
                    renderCells()
                }
            </div>
        </>
    )
}
export default PlacementContainer