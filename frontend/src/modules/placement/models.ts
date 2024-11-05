import { CoordinateSpec } from "../../models/fms_api_models"
import { Container, Project, Sample } from "../../models/frontend_models"

type PlacementCoordinates = string

export interface PlacementState {
    samples: Array<PlacementSample>
    sampleIndexByName: Record<PlacementSample['name'], number | undefined>
    sampleIndexByCellWithParent: Record<`${CellWithParentIdentifier['parentContainer']}@${CellWithParentIdentifier['coordinates']}`, number | undefined>

    parentContainers: RealParentContainerState[]

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
    > // numerators; subtracts totalAmount
    totalAmount: number // denominator
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

export interface CellWithParentState {
    preview: boolean
    selected: boolean
}

export interface RealParentContainerState {
    readonly name: Container['name']
    readonly spec: CoordinateSpec
    cells: CellWithParentState[]
    readonly cellsIndexByCoordinates: Record<PlacementCoordinates, number>
}

export interface RealParentContainerIdentifier {
    readonly parentContainer: Container['name'],
}

export interface CellWithParentIdentifier extends RealParentContainerIdentifier {
    readonly coordinates: PlacementCoordinates // tube or well coordinates
}
