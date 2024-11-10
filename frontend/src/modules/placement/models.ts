import { CoordinateSpec } from "../../models/fms_api_models"
import { Container, Project, Sample } from "../../models/frontend_models"

type PlacementCoordinates = string

export interface PlacementState {
    samples: PlacementSample[]
    parentContainers: ParentContainerState[]

    placementType: PlacementOptions['type']
    placementDirection: PlacementGroupOptions['direction']
    error: string | null
}

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

interface PlacementSampleBase {
    readonly name: Sample['name']
    readonly project: Project['name']
    readonly id: Sample['id']
    highlight: boolean
    amountByCell: Record<CellIdentifierString, number | undefined>
    totalAmount: number
}
export interface PlacementSampleWithoutParent extends PlacementSampleBase {
    readonly parentContainer: null
    readonly container: Container['name'] // has to be in a container
    readonly coordinates: null
}
export interface PlacementSampleWithParent extends PlacementSampleBase {
    readonly parentContainer: Container['name']
    readonly container: Container['name'] | null // tube name or null for well
    readonly coordinates: PlacementCoordinates // tube or well coordinates
}
export type PlacementSample = PlacementSampleWithoutParent | PlacementSampleWithParent
// container specific sample data (including for tubes without parent)
export interface PlacementSampleEntry {
    readonly name: Sample['name']
    selected: boolean
}

export interface CellState {
    preview: boolean
}

export interface ParentContainerStateBase {
    samples: Array<PlacementSampleEntry>
}

export interface TubesWithoutParentState extends ParentContainerStateBase {
    readonly name: null
}

export interface RealParentContainerState extends ParentContainerStateBase {
    readonly name: Container['name']
    readonly spec: CoordinateSpec
    cells: CellState[]
    readonly cellsIndexByCoordinates: Record<PlacementCoordinates, number>
}
export type ParentContainerState = TubesWithoutParentState | RealParentContainerState

export interface ParentContainerIdentifier {
    readonly parentContainer: ParentContainerState['name']
}
export interface RealParentContainerStateIdentifier extends ParentContainerIdentifier {
    readonly parentContainer: RealParentContainerState['name']
}

export interface CellIdentifier extends RealParentContainerStateIdentifier {
    readonly coordinates: PlacementCoordinates // tube or well coordinates
}
export type CellIdentifierString = `${CellIdentifier['parentContainer']}@${CellIdentifier['coordinates']}`