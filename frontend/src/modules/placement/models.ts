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
export type ParentContainerState = RealParentContainerState | TubesWithoutParentState
export interface PlacementSampleState extends Pick<Sample, 'id' | 'name'> {
    project: Project['name']
    location: CellIdentifier
    placedAt: CellWithParentIdentifier[]
}
export interface PlacementState {
    containers: ParentContainerState[]
    samples: PlacementSampleState[]
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
    readonly parentContainerName: null
    readonly coordinates?: undefined
    sample: Sample['id']
}
export type SampleIdentifier = Pick<PlacementSampleState, 'id'>

export type CellWithParentIdentifier = Pick<CellWithParentState, 'parentContainerName' | 'coordinates' | 'sample'>
export type CellWithoutParentIdentifier = Pick<CellWithoutParentState, 'sample'>
export type CellIdentifier = CellWithParentIdentifier | CellWithoutParentIdentifier

interface ParentContainerBaseState {}
export interface RealParentContainerState extends ParentContainerBaseState {
    readonly name: string
    readonly spec: CoordinateSpec
    cells: CellWithParentState[]
}
export interface TubesWithoutParentState extends ParentContainerBaseState {
    readonly name: null
    readonly spec: never[]
    cells: CellWithoutParentState[]
}

export type RealParentContainerIdentifier = Pick<RealParentContainerState, 'name'>
export type TubesWithoutParentIdentifier = Pick<TubesWithoutParentState, 'name'>
export type ContainerIdentifier = Pick<ParentContainerState, 'name'>
