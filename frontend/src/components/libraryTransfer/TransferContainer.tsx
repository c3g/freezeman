import React, { useCallback, useState } from "react";
import Cell from "./Cell"

interface ContainerProps {
    containerType: string,
    columns: number,
    rows: number,
    samples: any,
    selected?: number,
    updateSamples: (sampleList, containerType) => void
}

const TransferContainer = ({ containerType, columns, rows, samples, updateSamples, selected }: ContainerProps) => {

    const [isSelecting, setIsSelecting] = useState<boolean>(false)

    const nextChar = useCallback((c: string) => {
        return String.fromCharCode(c.charCodeAt(0) + 1);
    }, [])

    const checkSamples = useCallback((coordinate) => {
        let temp = { ...samples }
        if (temp[coordinate]) {
            return { ...temp[coordinate] }
        } else {
            return null
        }
    }, [samples])

    const onClick = useCallback((sample) => {
        let tempIsSelecting = isSelecting
        updateSamples(sample, containerType)
        setIsSelecting(!tempIsSelecting)
    }, [samples, isSelecting])

    const onMouseHover = useCallback((sample) => {
        if (isSelecting) {
            updateSamples(sample, containerType)
        }
    }, [isSelecting, samples])

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
                            isSelecting={isSelecting}
                            onMouseOver={onMouseHover}
                            sample={checkSamples(coordinate)}
                            coordinate={coordinate}
                            onClick={isSelecting ? () => setIsSelecting(false) : onClick} />
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
    }, [samples, isSelecting])
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