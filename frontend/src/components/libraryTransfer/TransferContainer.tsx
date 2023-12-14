import React, { useCallback, useState } from "react";
import Cell from "./Cell"
import { cellSample, containerSample } from "./LibraryTransferStep";

interface ContainerProps {
    containerType: string,
    columns: number,
    rows: number,
    samples: any,
    updateSample: (sample, containerType) => void
    selectedSamples?: number,
    direction?: string,
    updateSampleList?: (sampleList) => void
}

const TransferContainer = ({ containerType, columns, rows, samples, updateSample, selectedSamples, direction, updateSampleList }: ContainerProps) => {
    const [isSelecting, setIsSelecting] = useState<boolean>(false)
    const [previewCells, setPreviewCells] = useState<any>({})

    const nextChar = useCallback((c: string) => {
        return String.fromCharCode(c.charCodeAt(0) + 1);
    }, [])

    const previewGroupPlacement = useCallback((coordinate) => {
        if (selectedSamples && direction) {

            //coordinate row and column is separated with '_'
            const coords = (coordinate.toString()).split('_')
            let row = String(coords[0])
            let col = Number(coords[1])
            let tempPreviewCells = {}
            for (let i = 0; i < selectedSamples; i++) {
                if ((row.charCodeAt(0) < "i".charCodeAt(0)) && (col <= 12)) {

                    tempPreviewCells[row + "_" + col] = 'none'
                    if (direction == 'row') {
                        col += 1;
                    } else {
                        row = nextChar(row)
                    }
                }
            }
            console.log(tempPreviewCells)
            if (selectedSamples == Object.keys(tempPreviewCells).length)
                setPreviewCells(tempPreviewCells)
        }
    }, [previewCells, direction, selectedSamples])

    const checkSamples = useCallback((coordinate) => {
        let tempSamples: containerSample = { ...samples }
        const id = Object.keys(tempSamples).find((id) => tempSamples[id].coordinate == coordinate) ?? null;
        return id ? { id: id, type: id ? tempSamples[id].type : '' } : null
    }, [samples, selectedSamples])

    const onClick = useCallback((sample) => {
        //check to see if group placement is toggled so user can see where samples will be placed
        if (direction && updateSampleList && selectedSamples && selectedSamples > 0) {
            updateSampleList(previewCells)
        } else {
            //single sample selection/placement
            updateSample([sample], containerType)
            if (sample.id)
                setIsSelecting(!isSelecting)
        }
    }, [samples, isSelecting, direction, updateSampleList, previewCells])

    const onMouseHover = useCallback((sample) => {
        // if ((isSelecting && sample.sampleID) || (isSelecting && containerType == "destination")) {
        if (isSelecting && sample.id) {
            updateSample([sample], containerType)
        }
        //update preview for group placement every time mouse hovers over different cell
        if (containerType == "destination" && !isSelecting) {
            previewGroupPlacement(sample.coordinate)
        }
    }, [isSelecting, samples, previewCells, direction, selectedSamples])

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
    }, [samples, isSelecting, previewCells, direction])
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