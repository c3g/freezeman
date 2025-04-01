import { CoordinateSpec } from "../../models/fms_api_models"

export interface PlacementState {
    placementType: PlacementOptions['type']
    placementDirection: PlacementGroupOptions['direction']
    containers: Record<ContainerName, ContainerState>
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

export interface RealParentContainerState extends Required<ContainerIdentifier> {
    cells: Record<Coordinates, CellState>
    selections: PlacedSampleIdentifier[]
    spec: CoordinateSpec
}

export interface CellState extends CellIdentifier {
    existingSample: SampleState | null
    placedFrom: CellIdentifier[]
    preview: boolean
}

export interface TubesWithoutParentContainerState {
    existingSamples: SampleState[]
    selections: SampleIdentifier[]
}

export interface SampleState extends SampleIdentifier {
    projectName: string
    fromCell: CellIdentifier | null // null if from tubes without parent container
    placedAt: CellIdentifier[]
}

export type ContainerName = string
export type SampleName = string
export type Coordinates = string

export interface ContainerIdentifier { name?: ContainerName }
export interface SampleIdentifier { name: string }
export interface CellIdentifier { fromContainer: Required<ContainerIdentifier>, coordinates: Coordinates }
export interface PlacedSampleIdentifier { sample: SampleIdentifier, cell: Pick<CellIdentifier, 'coordinates'> }
