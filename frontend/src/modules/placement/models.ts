import { CoordinateSpec } from "../../models/fms_api_models"
import { Container, Project, Sample } from "../../models/frontend_models"

/* Placement State */

export interface PlacementState {
    samples: PlacementSample[]
    parentContainers: ParentContainerState[]

    placementType: PlacementOptions['type']
    placementDirection: PlacementGroupOptions['direction']
    error: string | null
}

/* Placement Options */

export enum PlacementType {
    PATTERN,
    GROUP,
}
export interface PlacementPatternOptions {
    readonly type: PlacementType.PATTERN
}
export enum PlacementDirections {
    ROW,
    COLUMN
}
export interface PlacementGroupOptions {
    readonly type: PlacementType.GROUP
    readonly direction: PlacementDirections
}
export type PlacementOptions = PlacementPatternOptions | PlacementGroupOptions

/* Placement Sample State */
// Shared state of samples (unique by id)

interface PlacementSampleBase {
    readonly name: Sample['name']
    readonly project: Project['name']
    readonly id: Sample['id']
    highlight: boolean
}
export interface PlacementSampleWithoutParent extends PlacementSampleBase {
    readonly parentContainer: null
    readonly container: Container['name'] // has to be in a container like tube
    readonly coordinates: null
}
export interface PlacementSampleWithParent extends PlacementSampleBase {
    readonly parentContainer: RealParentContainerState['name']
    readonly container: Container['name'] | null // tube name or null for well
    readonly coordinates: PlacementCoordinates // tube or well coordinates
}
export type PlacementSample = PlacementSampleWithoutParent | PlacementSampleWithParent
export type SampleIdentifier = PlacementSample['id']
// container specific sample data (including for tubes without parent)

/* Placement Sample Entry */

export interface PlacementSampleEntryBase {
    readonly id: SampleIdentifier
    selected: boolean
}
export interface PlacementSampleEntryWithoutParent extends PlacementSampleEntryBase, ParentContainerIdentifier {}
export interface PlacementSampleEntryWithParent extends PlacementSampleEntryBase, CellIdentifier {
    amount: number
}
export type PlacementSampleEntry = PlacementSampleEntryWithParent | PlacementSampleEntryWithoutParent

/* Placement Cell State */

export interface CellState {
    coordinates: PlacementCoordinates
    preview: boolean
}

/* Parent Container State */

export interface ParentContainerStateBase {}
export interface TubesWithoutParentState extends ParentContainerStateBase {
    readonly name: null
    samples: Array<PlacementSampleEntryWithoutParent>
}
export interface RealParentContainerState extends ParentContainerStateBase {
    readonly name: Container['name']
    readonly spec: CoordinateSpec
    cells: CellState[]
    samples: Array<PlacementSampleEntryWithParent>
}
export type ParentContainerState = TubesWithoutParentState | RealParentContainerState

export interface ParentContainerIdentifier {
    readonly parentContainer: ParentContainerState['name']
}
export interface RealParentContainerIdentifier extends ParentContainerIdentifier {
    readonly parentContainer: RealParentContainerState['name']
}

export type PlacementCoordinates = string
export interface CellIdentifier extends RealParentContainerIdentifier {
    readonly coordinates: PlacementCoordinates // tube or well coordinates
}
export type CellIdentifierString = `${CellIdentifier['parentContainer']}@${CellIdentifier['coordinates']}`