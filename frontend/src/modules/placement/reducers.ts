import { Container, ItemsByID, Sample } from "../../models/frontend_models"

function toString() {
    const row = String.fromCharCode('A'.charCodeAt(0) + this.row)
    const col = (this.col < 10 ? this.col.toString().padStart(2, '0') : this.col)
    return row + col
}

interface Coordinate {
    row: number
    col: number
}

export interface DestinationContainer extends Partial<Pick<Container, 'name' | 'barcode' | 'kind'>> {}

export interface Cell {
    coordinate: Coordinate
    state: undefined | 'selected' | 'preview' | 'placed'
    sample?: Sample['id']
    placedTo?: Cell
    placedFrom?: Cell
}

export interface PlacementState {
    sourceSamples: Array<Sample['id']>
    sourceContainers: Array<Container['id']>
    destination: {
        cells: Record<string, Cell>
        container: DestinationContainer
    }
}
