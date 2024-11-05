import { CoordinateSpec } from "../../models/fms_api_models"
import { Container, Project, Sample } from "../../models/frontend_models"

export const TUBES_WITHOUT_PARENT_NAME = "Tubes without parent"

type PlacementCoordinates = string

export interface PlacementState {
    samples: Array<PlacementSample>
    sampleIndexByName: Record<PlacementSample['name'], number | undefined>
    sampleIndexByCellWithParent: Record<`${CellWithParentIdentifier['parentContainer']}@${CellWithParentIdentifier['coordinates']}`, number | undefined>

    parentContainers: RealParentContainerState[]
    tubesWithoutParent: TubesWithoutParentState

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
    placedAt: Record<
        `${CellWithParentIdentifier['parentContainer']}@${CellWithParentIdentifier['coordinates']}`,
        number
    >
}
export interface PlacementSampleWithoutParent extends PlacementSampleBase {
    readonly parentContainer: null
    readonly container: Container['name']
    readonly coordinates: null
}
export interface PlacementSampleWithParent extends PlacementSampleBase {
    readonly parentContainer: Container['name']
    readonly container: Container['name'] | null // tube name or null for well
    readonly coordinates: PlacementCoordinates // tube or well coordinates
}
export type PlacementSample = PlacementSampleWithoutParent | PlacementSampleWithParent

/**
 * Each cell can contain more than one sample.
 * If the cell already contains a sample, by default it would be amounts[sample.id] = 1, totalAmount = 1.
 * If the sample is completely distributed among 5 cells, then amounts[sample.id] = 0, totalAmount = 5.
 */

interface CellStateBase {
    selected: boolean
}
export interface CellStateWithoutParent extends CellStateBase {
    readonly parentContainer: null
}
export interface CellStateWithParent extends CellStateBase {
    readonly parentContainer: Container['name']
    preview: boolean
}
export type CellState = CellStateWithParent

interface BaseContainerState {}
export interface TubesWithoutParentState extends BaseContainerState {
    readonly name: null
    readonly spec: null
}
export interface RealParentContainerState extends BaseContainerState {
    readonly name: Container['name']
    readonly spec: CoordinateSpec
    cells: CellStateWithParent[]
    readonly cellsIndexByCoordinates: Record<PlacementCoordinates, number>
}
export type ParentContainerState = TubesWithoutParentState | RealParentContainerState

export interface RealParentContainerIdentifier {
    readonly parentContainer: Container['name'],
}
export interface TubesWithoutParentIdentifier {
    readonly parentContainer: null,
}
export type ParentContainerIdentifier = RealParentContainerIdentifier | TubesWithoutParentIdentifier

export interface CellWithParentIdentifier extends RealParentContainerIdentifier {
    readonly coordinates: PlacementCoordinates // tube or well coordinates
}
export type CellWithoutParentIdentifier = TubesWithoutParentIdentifier & ({
    readonly container: Container['name'], // tube name
} | {
    readonly sample: Sample['name'], // sample name
})
export type CellIdentifier = CellWithParentIdentifier | CellWithoutParentIdentifier
