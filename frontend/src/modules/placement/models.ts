import { CoordinateSpec } from "../../models/fms_api_models"
import { Sample } from "../../models/frontend_models"

export interface PlacementState {
    containers: ContainerState[]
    placementType: PlacementOptions['type']
    placementDirection: PlacementGroupOptions['direction']
    error?: string
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

type ContainerState = RealParentContainerState | TubesWithoutParentContainerState

export interface RealParentContainerState {
    id: number
    name: string
    cells: Record<Coordinates, CellState>
    selections: Record<SelectionKey, PlacedSampleIdentifier>
}

export interface CellState {
    coordinates: Coordinates
}

export interface TubesWithoutParentContainerState {
}

export type Coordinates = string
export type ContainerID = number

export interface ContainerIdentifier { id?: ContainerID }
export interface SampleIdentifier { id: number }
export interface CellIdentifier { fromContainer: Required<ContainerIdentifier>, coordinates: Coordinates }
export interface PlacedSampleIdentifier { sample: SampleIdentifier, cell: Pick<CellIdentifier, 'coordinates'> }

type SelectionKey = `${PlacedSampleIdentifier['sample']['id']}-${PlacedSampleIdentifier['cell']['coordinates']}`