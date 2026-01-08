import { CoordinateSpec } from "../../models/fms_api_models"

export interface PlacementState {
    placementType: PlacementOptions['type']
    placementDirection: PlacementSequentialOptions['direction']
    tubesWithoutParentContainer: TubesWithoutParentContainerState
    realParentContainers: Record<ContainerName, RealParentContainerState | undefined>
    samples: Record<SampleID, SampleState | undefined>
    error?: string
}

export enum PlacementType {
    SEQUENTIAL = 'Sequential',
    SOURCE_PATTERN = 'Source',
    QUADRANT_PATTERN = 'Quadrant',
}
export interface PlacementSequentialOptions {
    type: PlacementType.SEQUENTIAL
    direction: PlacementDirections
}
export interface PlacementSourcePatternOptions {
    type: PlacementType.SOURCE_PATTERN
}
export interface PlacementQuadrantPatternOptions {
    type: PlacementType.QUADRANT_PATTERN
}
export enum PlacementDirections {
    ROW,
    COLUMN
}
export type PlacementOptions = PlacementSequentialOptions | PlacementSourcePatternOptions | PlacementQuadrantPatternOptions
export interface RealParentContainerState extends RealParentContainerIdentifier {
    cells: Record<Coordinates, CellState>
    spec: CoordinateSpec
}

export interface CellState extends CellIdentifier {
    samples: Record<SampleID, SampleEntry | undefined>
    preview: Coordinates | null // empty string for tubes without parent
}

export interface TubesWithoutParentContainerState extends TubesWithoutParentContainerIdentifier {
    samples: Record<SampleID, SampleEntry | undefined>
}

export interface SampleState extends SampleIdentifier {
    containerName: ContainerName, // can be the name of a tube or container of the well
    name: SampleName
    fromCell: CellIdentifier | null
    placedAt: CellIdentifier[]
}

export interface SampleEntry {
    selected: boolean
}

export type ContainerName = string
export type SampleName = string
export type SampleID = number
export type Coordinates = string

export interface RealParentContainerIdentifier { name: ContainerName }
export interface TubesWithoutParentContainerIdentifier { name: null }
export type ParentContainerIdentifier = RealParentContainerIdentifier | TubesWithoutParentContainerIdentifier
export interface SampleIdentifier { id: SampleID }
export interface CellIdentifier { fromContainer: RealParentContainerIdentifier, coordinates: Coordinates }
