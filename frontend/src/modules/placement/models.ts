import { CoordinateSpec } from "../../models/fms_api_models"
import { Container, Sample } from "../../models/frontend_models"

export interface PlacementState {
    samples: Record<Sample['id'], ContainerIdentifier>
    containers: Record<Container['name'], ContainerState>
    placementType: PlacementOptions['type']
    placementDirection: PlacementGroupOptions['direction']
    error: string | null
}

export enum PlacementType {
    PATTERN,
    GROUP,
}
export interface PlacementPatternOptions {
    type: PlacementType.PATTERN
}
export enum PlacementDirections {
    ROW,
    COLUMN
}
export interface PlacementGroupOptions {
    type: PlacementType.GROUP
    direction: PlacementDirections
}
export type PlacementOptions = PlacementPatternOptions | PlacementGroupOptions

export interface SamplePlacement {
    name: Sample['name']
    id: Sample['id']
}

/**
 * Each cell can contain more than one sample.
 * The amount of each sample is proportional to capacity of the cell/container and the amount of that sample in the cell.
 * If the cell already contains a sample, by default it would be amounts[sample.id] = 1, totalAmount = 1.
 * If the sample is completely distributed among 5 cells, then amounts[sample.id] = 0, totalAmount = 5.
 */

interface CellStateBase {
    readonly parentContainerName: Container['name']
    readonly container: Container['name']
    amounts: Record<Sample['id'], number> // numerators (amount of each sample which sums to totalAmount)
    totalAmount: number // denominator (the sum of amount of samples allowed)
    preview: boolean
}
export interface CellStateWithoutParent extends CellStateBase {
    readonly coordinates: null
}
export interface CellStateWithParent extends CellStateBase {
    readonly coordinates: string
}
export type CellState = CellStateWithoutParent | CellStateWithParent

interface BaseContainerState {
    cells: CellState[]
}
export interface TubesWithoutParent extends BaseContainerState {
    readonly containerName: null
    readonly spec: null
    cellsIndexByCoordinates: null
}
export interface ParentContainerState extends BaseContainerState {
    readonly containerName: Container['name']
    readonly spec: CoordinateSpec
    readonly cellsIndexByCoordinates: Record<CellStateWithParent['coordinates'], number>
}
export type ContainerState = TubesWithoutParent | ParentContainerState

export type ContainerIdentifier = {
    containerName: Container['name'],
} | {
    containerName: null,
}
export type CellIdentifier = {
    containerName: Container['name'],
    coordinates: string
} | {
    containerName: null,
    coordinates: null,
}
