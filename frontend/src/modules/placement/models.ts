import { CoordinateSpec } from "../../models/fms_api_models"

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
    samples: Record<PlacementSample['id'], PlacementSample>
    placementType: PlacementOptions['type']
    placementDirection: PlacementGroupOptions['direction']
    error?: string
}

export interface CellState {}

interface BaseParentContainerState {
    // this is only sorted once by comparePlacementSamples
    // when first initialized from payload and then
    // newly placed samples are appended after
    samples: SampleEntry[]
}
export interface ParentContainerState extends BaseParentContainerState {
    readonly name: string
    readonly spec: CoordinateSpec
    readonly cells: Record<Coordinates, CellState>
}
export interface TubesWithoutParentState extends BaseParentContainerState {
    readonly name: null
    spec?: undefined
}

interface PlacementSample {
    id: number
    name: string
    project: string
    parentContainerName: ParentContainerIdentifier['parentContainerName']
    coordinates: CellIdentifier['coordinates']
}

/**
 * A sample placement is a sample that has been placed or is already a container.
 * We can tell if a sample is already in a parent container 'X' by checking if fromParentContainer is 'X'.
 */
interface SampleEntry {
    readonly coordinates?: CellIdentifier['coordinates']
    readonly id: number
    selected: boolean
}

type Coordinates = string

export interface RealParentContainerIdentifier {
    parentContainerName: string
}
export interface TubesWithoutParentIdentifier {
    parentContainerName?: undefined
}
export type ParentContainerIdentifier = RealParentContainerIdentifier | TubesWithoutParentIdentifier

export interface CellIdentifier extends RealParentContainerIdentifier {
    coordinates: Coordinates
}