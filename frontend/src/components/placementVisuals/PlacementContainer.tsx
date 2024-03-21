import React, { useCallback, useState } from "react"
import { Empty } from "antd"
import { DESTINATION_STRING, NONE_STRING, PREVIEW_STRING, SELECTED_STRING, sampleInfo } from "./PlacementTab"
import Cell from "./Cell"

interface PlacementContainerProps {
    updateSamples: (sampleList, containerType, containerRows, containerColumns) => void,
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

    const getNumericRowFromCoordinates = useCallback((coordinates) => {
        return coordinates.charCodeAt(0) - 64
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
        // selected cells have coords ['a01', 'a03'], hovered cell to place is 'b04'. Destination samples will become ['b04, 'b06']
        const preview: sampleInfo[] = []

        //iterates over the selected samples to find the most left column of them
        if (Object.keys(selectedSampleList).length > 0) {
            const cellsByCoordinate: any = Object.values(selectedSampleList)

            const mostLeftColumn = cellsByCoordinate.reduce((acc, curr) => {
              const currentColumn = getColumnFromCoordinates(curr.coordinates)
              return Math.min(currentColumn, acc)
            }, Infinity)

            const TopMostRow = cellsByCoordinate.reduce((acc, curr) => {
              const currentRow = getNumericRowFromCoordinates(curr.coordinates)
              return Math.min(currentRow, acc)
            }, Infinity)
            
            //sorting the sampleList by coordinates
            cellsByCoordinate.sort((sortByCoordinate))

            //getting coordinates of the clicked cell
            const placedColumn = getColumnFromCoordinates(coordinates)
            const placedRow = getNumericRowFromCoordinates(coordinates)
            let transformedRow
            let transformedColumn

            //iterate through each selected sample and transforming the column and row to correspond to the one that was clicked
            cellsByCoordinate.forEach(value => {
                const coord = value.coordinates
                //calculating the difference between the current cell's coordinate and the top most row in this selected samples group
                const verticalDifference = getDiff(getNumericRowFromCoordinates(coord), TopMostRow)
                //calculating the difference between the current cell's coordinate and the most left column in this selected samples group
                const horizontalDifference = getDiff(getColumnFromCoordinates(coord), mostLeftColumn)

                // Finding the position by applying the differences
                transformedRow = placedRow + verticalDifference + 64  // Add 64 to get the proper ASCII code
                transformedColumn = placedColumn + horizontalDifference
                preview.push({ id: value.id, type: PREVIEW_STRING, coordinates: String.fromCharCode(transformedRow) + padColumn(transformedColumn) })
            })

            if (preview.length > 0)
                setPreviewCells(preview)
        }
    }, [previewCells, selectedSampleList])

    //allows to preview the cells that the group of selected samples will go into
    const previewGroupPlacement = useCallback((coordinates) => {
        const preview: sampleInfo[] = []

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



    const onClick = useCallback((sample, e) => {
        e.stopPropagation()
        if ((!(previewCells.length > 0 && !isSelecting && sample.id))) {
            updateSamples([...previewCells, sample], containerType, rows, columns)
        }
        if (sample.id)
        {
            setIsSelecting(!isSelecting)
        }
    }, [samples, isSelecting, direction, updateSamples, previewCells, selectedSampleList])

    const onMouseHover = useCallback((sample: any) => {
        //add sample to selection
        if (isSelecting && sample.id) {
            updateSamples([...previewCells, sample], containerType, rows, columns)
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
            const cells: any[] = []
            let char = 'A'
            let coordinates = ''
            //renders header based on the number of columns provided to the component
            const headerCells: React.ReactElement[] = []
            const cellSize = columns <= 12 ? "cell" : "tiny-cell"
	    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, rows)
	    for (let i = 0; i < columns + 1; i++) {
                headerCells.push(
                    <td key={'header_' + i} className={i != 0 ? cellSize : undefined} style={i != 0 ? { backgroundColor: '#001529', color: 'white', cursor: 'grab' } : undefined} onClick={(e) => {
		        e.stopPropagation()
			const samples = [...letters].map((rowLetter) => {
			    const colNumber = i
			    const coordinates = rowLetter + "" + (padColumn(colNumber))
			    return checkSamples(coordinates)
			}).filter(x => x)
			updateSamples([...previewCells, ...samples], containerType, rows, columns)
		    }}>
                        {
                            i != 0 ? i : ''
                        }
                    </td>
                )
            }
            //adds number headers to total number of columns
            cells.push(<tr key={'headers'} className={"header-row"}>
                {
                    headerCells
                }
            </tr>)
            //renders each row with the corresponding row letter 'A','B', etc.
            for (let i = 0; i < rows; i++) {
                const charCopy = char.repeat(1)
		const rowOfCells: React.ReactElement[] = []
                rowOfCells.push(
                    <td key={char} className={cellSize} style={{ backgroundColor: '#001529', color: 'white', cursor: 'grab' }} onClick={(e) => {
		        e.stopPropagation()
			const samples = [...Array(columns).keys()].map((c) => {
			    const colNumber = c + 1
			    const coordinates = charCopy + "" + (padColumn(colNumber))
			    return checkSamples(coordinates)
			}).filter(x => x)
			updateSamples([...previewCells, ...samples], containerType, rows, columns)
		    }}>
                        {
                            char
                        }
                    </td>
                )
                //renders cells
                for (let colNumber = 1; colNumber < columns + 1; colNumber++) {
                    coordinates = char + "" + (padColumn(colNumber))
                    rowOfCells.push(
		        <td>
                            <Cell key={coordinates}
                                onCellMouseLeave={() => setPreviewCells([])}
                                isSelecting={isSelecting}
                                onCellMouseOver={onMouseHover}
                                sample={checkSamples(coordinates)}
                                coordinates={coordinates}
                                outline={previewCells.find(sample => sample.coordinates == coordinates) ? true : false}
                                cellSize={cellSize}
                                onCellClick={isSelecting ? () => setIsSelecting(false) : onClick} />
			</td>
                    )
                }
                //pushes rowOfCells to cell array
                cells.push(
                    <tr key={'row_' + char} className={"row"}>
                        {
                            rowOfCells
                        }
                    </tr>
                )
                //changes next character in the alphabet for next row
                char = nextChar(char)
            }
            return cells
        }, [samples, isSelecting, previewCells, direction, selectedSampleList, pattern])

        const renderEmpty = useCallback(() => {
          return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        }, [])

    return (
        <>
            <table className={"transfer"}
              style={{ cursor: isSelecting ? 'crosshair' : 'auto' }}
              onClick={isSelecting ? () => setIsSelecting(false) : () => setIsSelecting(true)} // deactivate selecting between cells
            >
                {
                  (rows === 0 && columns === 0) ?
                    renderEmpty()
                  :
                    renderCells()
                
                }
            </table>
        </>
    )
}
export default PlacementContainer
