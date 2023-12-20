import React, { useCallback, useState } from "react";
import Cell from "./Cell"
import { NONE_STRING, containerSample } from "./LibraryTransferStep";

interface ContainerProps {
    containerType: string,
    columns: number,
    rows: number,
    samples: any,
    updateSample: (sample, containerType) => void
    direction?: string,
    updateSampleGroup?: (sampleList) => void
    selectedSampleList: any,
}

const TransferContainer = ({ containerType, columns, rows, samples, updateSample, direction, updateSampleGroup, selectedSampleList }: ContainerProps) => {
    const [isSelecting, setIsSelecting] = useState<boolean>(false)
    const [previewCells, setPreviewCells] = useState<any>({})

    const nextChar = useCallback((c: string) => {
        return String.fromCharCode(c.charCodeAt(0) + 1);
    }, [])

    const previewGroupPlacement = useCallback((coordinate) => {
        let tempPreviewCells = {}
        const count = Object.keys(selectedSampleList).length 
        if (count > 0 && direction) {
            //coordinate row and column is separated with '_'
            const coords = (coordinate.toString()).split('_')
            let row = String(coords[0])
            let col = Number(coords[1])
            for (let i = 0; i < count; i++) {
                if ((row.charCodeAt(0) < "i".charCodeAt(0)) && (col <= 12)) {

                    tempPreviewCells[row + "_" + col] = NONE_STRING
                    if (direction == 'row') {
                        col += 1;
                    } else {
                        row = nextChar(row)
                    }
                }
            }
        } else {
            tempPreviewCells[coordinate] = NONE_STRING
        }

        if (Object.keys(tempPreviewCells).length > 0)
            setPreviewCells(tempPreviewCells)
    }, [previewCells, direction, selectedSampleList])

    const checkSamples = useCallback((coordinate) => {
        let tempSamples: containerSample = { ...samples }
        const id = Object.keys(tempSamples).find((id) => tempSamples[id].coordinate == coordinate) ?? null;
        let type = NONE_STRING
        if (id) {
            // console.log(selectedIds[id])
            if (selectedSampleList && selectedSampleList[id] && selectedSampleList[id].type == containerType)
                type = 'selected'
            else
                type = tempSamples[id].type
        }

        return id ? { id: id, type: type } : null
    }, [samples, selectedSampleList])

    const onClick = useCallback((sample) => {
        //check to see if group placement is toggled so user can see where samples will be placed
        if (direction && updateSampleGroup && selectedSampleList && Object.keys(selectedSampleList).length > 0) {
            updateSampleGroup(previewCells)
        } else {
            //single sample selection/placement
            updateSample([sample], containerType)
            if (sample.id)
                setIsSelecting(!isSelecting)
        }
    }, [samples, isSelecting, direction, updateSampleGroup, previewCells])

    const onMouseHover = useCallback((sample: any) => {
        if (isSelecting && sample.id) {
            updateSample([sample], containerType)
        }
        //update preview for group placement every time mouse hovers over different cell
        if (!isSelecting && !sample.id) {
            previewGroupPlacement(sample.coordinate)
        }
    }, [isSelecting, samples, direction, selectedSampleList])

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
    }, [samples, isSelecting, previewCells, direction, selectedSampleList])

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