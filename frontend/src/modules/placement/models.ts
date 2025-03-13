import { CoordinateSpec } from "../../models/fms_api_models"
import { Project, Sample } from "../../models/frontend_models"

export enum PlacementType {
    PATTERN,
    GROUP,
}
export interface PlacementPatternOptions {}
export enum PlacementDirections {
    ROW,
    COLUMN
}
export interface PlacementGroupOptions {
    direction: PlacementDirections
}
export interface PlacementOptions {
    type: PlacementType,
    patternOptions: PlacementPatternOptions
    groupOptions: PlacementGroupOptions
    stickySelection: boolean
}
export type PlacementOption =
    { type: PlacementType.GROUP }   & PlacementGroupOptions |
    { type: PlacementType.PATTERN } & PlacementPatternOptions

export type CellState = CellWithParentState | CellWithoutParentState
export type ContainerState = ParentContainerState | TubesWithoutParentState
export interface PlacementState {
    containers: ContainerState[]
    options: PlacementOptions
    error?: string
}

interface CellStateBase {
    selected: boolean
}
export interface CellWithParentState extends CellStateBase {
    readonly parentContainerName: string
    readonly coordinates: string
    placedFrom: Array<Sample['id']>
    preview: boolean
    sample: Sample['id'] | null
}
export interface CellWithoutParentState extends CellStateBase {
    sample: Sample['id']
}

export type CellWithParentIdentifier = Pick<CellWithParentState, 'parentContainerName' | 'coordinates'>
export type CellWithoutParentIdentifier = Pick<CellWithoutParentState, 'sample'>
export type CellIdentifier = CellWithParentIdentifier | CellWithoutParentIdentifier

interface BaseParentContainerState {}
export interface ParentContainerState extends BaseParentContainerState {
    readonly name: string
    readonly spec: CoordinateSpec
    cells: CellWithParentState[]
}
export interface TubesWithoutParentState extends BaseParentContainerState {
    readonly name: null
    readonly spec: []
    cells: CellWithoutParentState[]
}
export type ContainerIdentifier = Pick<ContainerState, 'name'>

export interface PlacementSample extends Pick<Sample, 'id' | 'name'> {
    project: Project['name']
    location: CellIdentifier
    placedAt: CellWithParentIdentifier[]
}