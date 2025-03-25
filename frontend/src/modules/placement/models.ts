import { CoordinateSpec } from "../../models/fms_api_models"
import { Container, Sample } from "../../models/frontend_models"

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

export type ContainerState = ParentContainerState | TubesWithoutParentState
export interface PlacementState {
    containers: ContainerState[]
    placementType: PlacementOptions['type']
    placementDirection: PlacementGroupOptions['direction']
    error?: string
}

export enum CellState {
    EMPTY,
    OCCUPIED,
    PREVIEW,
    PARTIALLY_SELECTED,
    FULLY_SELECTED,
    ERROR,
    HIGHLIGHTED,
}

interface BaseParentContainerState {
    samples: SamplePlacement[]
}
export interface ParentContainerState extends BaseParentContainerState {
    readonly name: string
    readonly spec: CoordinateSpec
    cells: Record<Coordinates, CellState>
}
export interface TubesWithoutParentState extends BaseParentContainerState {
    readonly name: null
}
export type ContainerIdentifier = Pick<ContainerState, 'name'>

export interface SamplePlacement {
    existing: boolean
    id: number
    project: string
    coordinates: string
    selected: boolean
    fromParentContainer: ContainerState['name']
    fromCell: Coordinates | undefined // coordinates
}

type Coordinates = string