import { CoordinateSpec } from "../../models/fms_api_models"

export interface PlacementState {
    placementType: PlacementOptions['type']
    placementDirection: PlacementGroupOptions['direction']
    tubesWithoutParentContainer: TubesWithoutParentContainerState
    realParentContainers: Record<ContainerName, RealParentContainerState | undefined>
    samples: Record<SampleID, SampleState | undefined>
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
