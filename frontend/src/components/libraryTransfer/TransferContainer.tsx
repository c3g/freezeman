import React, { useCallback, useState } from "react";
import Cell from "./Cell"

interface ContainerProps {
    containerType: string,
    columns: number,
    rows: number,
    samples: any,
    selectedSamples?: number,
    direction?: string,
    updateSampleList: (sample, containerType) => void
    updateSamples?: (sampleList) => void
}

const TransferContainer = ({ containerType, columns, rows, samples, updateSampleList, selectedSamples, direction, updateSamples }: ContainerProps) => {

    const [isSelecting, setIsSelecting] = useState<boolean>(false)
    const [previewCells, setPreviewCells] = useState<any>({})

    const nextChar = useCallback((c: string) => {
        return String.fromCharCode(c.charCodeAt(0) + 1);
    }, [])

    const previewGroupPlacement = useCallback((coordinate) => {
        if (selectedSamples && direction) {
            const coords = (coordinate.toString()).split('_')
            let row = String(coords[0])
            let col = Number(coords[1])
            let tempPreviewCells = {}
            let rowBool = true;
            if (direction != 'row') {
                rowBool = false
            }
            for (let i = 0; i < selectedSamples; i++) {
                tempPreviewCells[row + "_" + col] = 'none'
                if (rowBool) {
                    col += 1;
                } else {
                    row = nextChar(row)
                }
            }
            setPreviewCells(tempPreviewCells)
        }
    }, [previewCells, direction, selectedSamples])

    const checkSamples = useCallback((coordinate) => {
        let temp = { ...samples }
        if (temp[coordinate]) {
            return { ...temp[coordinate] }
        } else {
            return null
        }
    }, [samples])

    const onClick = useCallback((sample) => {
        if (direction && updateSamples && selectedSamples && selectedSamples > 0) {
            updateSamples(previewCells)
        } else {
            updateSampleList([sample], containerType)
            setIsSelecting(!isSelecting)
        }
    }, [samples, isSelecting, direction, updateSamples, previewCells])

    const onMouseHover = useCallback((sample) => {
        if ((isSelecting && sample.sampleID) || (isSelecting && containerType == "destination")) {
            updateSampleList([sample], containerType)
        }
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
                <div key={'header_' + i} style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {
                        i != 0 ? i : ''
                    }
                </div>
            )
        }
        //adds number heards to total number of cells
        cells.push(<div key={'headers'} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
            {
                headerCells
            }
        </div>)
        //renders each row with the corresponding row letter coordinate
        for (let i = 0; i < rows; i++) {
            let rowOfCells: React.ReactElement[] = []
            rowOfCells.push(
                <div key={char} style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#001529', color: 'white', borderRadius: '10px' }}>
                    {
                        char.toUpperCase()
                    }
                </div>
            )
            //renders container cells
            for (let x = 1; x < columns + 1; x++) {
                coordinate = char + "_" + (x);
                rowOfCells.push(
                    <div key={coordinate} style={{ display: 'flex', height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <Cell key={coordinate}
                            onCellMouseLeave={() => setPreviewCells({})}
                            isSelecting={isSelecting}
                            onCellMouseOver={onMouseHover}
                            sample={checkSamples(coordinate)}
                            coordinate={coordinate}
                            outline={previewCells[coordinate] ? true : false}
                            onCellClick={isSelecting ? () => setIsSelecting(false) : onClick} />
                    </div>
                )
            }
            //pushes rowOfCells to cell array
            cells.push(
                <div key={'row_' + char} style={{ display: 'flex', gap: '1%', flexDirection: 'row', justifyContent: 'space-around' }}>
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
            <div style={{ display: 'flex', height: '100%', width: '100%', flexDirection: 'column', justifyContent: 'space-around', gap: '1vh', border: 'solid grey 1px', padding: '1%' }}>
                {
                    renderCells()
                }
            </div>
        </>
    )
}
export default TransferContainer