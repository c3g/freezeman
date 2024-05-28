import { CoordinateSpec } from "../../models/fms_api_models"
import { Sample } from "../../models/frontend_models"

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

export type CellState = CellWithParentState | CellWithoutParentState
export type ContainerState = ParentContainerState | TubesWithoutParentState
export interface PlacementState {
    containers: ContainerState[]
    placementType: PlacementOptions['type']
    placementDirection: PlacementGroupOptions['direction']
    error?: string
}

interface CellStateBase {
    selected: boolean
    sample: Sample['id'] | null
    name: string
    placedAt: null | CellWithParentIdentifier
}
export interface CellWithParentState extends CellStateBase {
    readonly parentContainerName: string
    readonly coordinates: string
    placedFrom: null | CellIdentifier
    preview: boolean
}
export interface CellWithoutParentState extends CellStateBase {
    readonly parentContainerName: null
    readonly coordinates?: undefined
    placedFrom?: null
    preview?: false
}

export type CellWithParentIdentifier = Pick<CellWithParentState, 'parentContainerName' | 'coordinates'> & { sample?: CellWithoutParentState['sample'] } // sample is just to stop typescript from whining
export type CellWithoutParentIdentifier = Pick<CellWithoutParentState, 'parentContainerName' | 'coordinates' | 'sample'>
export type CellIdentifier = CellWithParentIdentifier | CellWithoutParentIdentifier

interface BaseParentContainerState {
    cellsIndexBySampleID: Record<Sample['id'], number>
}
export interface ParentContainerState extends BaseParentContainerState {
    readonly name: string
    readonly spec: CoordinateSpec
    cells: CellWithParentState[]
    readonly cellsIndexByCoordinates: Record<string, number> // this should never change after it's initialized
}
export interface TubesWithoutParentState extends BaseParentContainerState {
    readonly name: null
    readonly spec: []
    cells: CellWithoutParentState[]
}
export type ContainerIdentifier = Pick<ContainerState, 'name'>

