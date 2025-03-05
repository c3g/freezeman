import { CoordinateSpec } from "../../models/fms_api_models"
import { Container, Project, Sample } from "../../models/frontend_models"

/* Placement State */

export interface PlacementState {
    samples: SampleDetail[]
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

/* Sample Detail */

interface SampleDetailBase {
    readonly name: Sample['name']
    readonly project: Project['name']
    readonly id: Sample['id']
    readonly volume: number
    highlight: boolean
}
export interface SampleDetailWithoutParent extends SampleDetailBase {
    readonly parentContainer: null
    readonly container: Container['name'] // has to be in a container like tube
    readonly coordinates: null
}
export interface SampleDetailWithParent extends SampleDetailBase {
    readonly parentContainer: RealParentContainerState['name']
    readonly container: Container['name'] | null // tube name or null for well
    readonly coordinates: PlacementCoordinates // tube or well coordinates
}
export type SampleDetail = SampleDetailWithoutParent | SampleDetailWithParent
export type SampleIdentifier = SampleDetail['id']

/* Placement Sample */

interface PlacementSampleBase {
    readonly id: SampleIdentifier
    selected: boolean
    volume: number
}
export interface PlacementSampleWithoutParent extends PlacementSampleBase {}
export interface PlacementSampleWithParent extends PlacementSampleBase {}
export type PlacementSample = PlacementSampleWithParent | PlacementSampleWithoutParent

/* Placement Cell State */

export interface CellState {
    coordinates: PlacementCoordinates
    preview: boolean
    sample: PlacementSampleWithParent | null
}

/* Parent Container State */

interface ParentContainerStateBase {}
export interface TubesWithoutParentState extends ParentContainerStateBase {
    readonly name: null
    existingSamples: Array<PlacementSampleWithoutParent>
}
export interface RealParentContainerState extends ParentContainerStateBase {
    readonly name: Container['name']
    existingSamples: Array<PlacementSampleWithParent>
    readonly spec: CoordinateSpec
    cells: CellState[]
}
export type ParentContainerState = TubesWithoutParentState | RealParentContainerState

export interface TubesWithoutParentIdentifier {
    readonly parentContainer: null
}
export interface RealParentContainerIdentifier {
    readonly parentContainer: RealParentContainerState['name']
}
export type ParentContainerIdentifier = RealParentContainerIdentifier | TubesWithoutParentIdentifier

export type PlacementCoordinates = string
export interface CellIdentifier extends RealParentContainerIdentifier {
    readonly coordinates: PlacementCoordinates // tube or well coordinates
}
export type CellIdentifierString = `${CellIdentifier['parentContainer']}@${CellIdentifier['coordinates']}`