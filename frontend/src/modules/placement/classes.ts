import { TUBES_WIHOUT_PARENT_NAME } from "../../constants"
import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"
import { compareArray, coordinatesToOffsets, offsetsToCoordinates } from "../../utils/functions"
import { CellIdentifier, RealParentContainerIdentifier, ContainerName, Coordinates, PlacementDirections, PlacementState, PlacementType, RealParentContainerState, SampleID, SampleIdentifier, SampleName, TubesWithoutParentContainerState, CellState, SampleState } from "./models"
import { LoadContainerPayload } from "./reducers"

class PlacementContext {
    placementState: PlacementState

    // these fields are not set by default
    _sourceContainer: RealParentContainerClass | TubesWithoutParentClass
    _destinationContainer: RealParentContainerClass

    constructor(state: PlacementState) {
        this.placementState = state
    }

    setSourceContainer(containerID?: RealParentContainerIdentifier) {
        this._sourceContainer = containerID ? new RealParentContainerClass(this, containerID) : new TubesWithoutParentClass(this)
    }
    setDestinationContainer(containerID: RealParentContainerIdentifier) {
        this._destinationContainer = new RealParentContainerClass(this, containerID)
    }

    get sourceContainer() {
        if (!this._sourceContainer) {
            throw new Error(`Source container is not set`)
        }
        return this._sourceContainer
    }
    get destinationContainer() {
        if (!this._destinationContainer) {
            throw new Error(`Destination container is not set`)
        }
        return this._destinationContainer
    }
}
type CellKey = `${ContainerName}-${Coordinates}`

class PlacementObject {
    context: PlacementContext
    placementState: PlacementState

    constructor(state: PlacementState, context?: PlacementContext) {
        this.placementState = state
        this.context = context ?? new PlacementContext(state)
    }
}

export class PlacementClass extends PlacementObject {
    constructor(state: PlacementState) {
        super(state)
    }

    loadContainerPayload(payload: LoadContainerPayload) {
        if (payload.parentContainerName == null) {
            let tubesWithoutParent = this.placementState.tubesWithoutParentContainer
            if (!tubesWithoutParent) {
                tubesWithoutParent = this.placementState.tubesWithoutParentContainer = {
                    samples: {}
                }
            }
            const existingSampleIDs = new Set<SampleID>(payload.cells.map(c => c.sample))
            for (const sampleID of Object.keys(tubesWithoutParent.samples).map(parseInt)) {
                if (!existingSampleIDs.has(sampleID)) {
                    for (const cellID of this.placementState.samples[sampleID].placedAt) {
                        delete this.placementState.realParentContainers[cellID.fromContainer.name]?.cells[cellID.coordinates].samples[sampleID]
                    }
                    delete tubesWithoutParent.samples[sampleID]
                    delete this.placementState.samples[sampleID]
                }
            }
            for (const cell of payload.cells) {
                const sampleID = cell.sample
                const sample = this.placementState.samples[sampleID] ?? {
                    containerName: 'SOS',
                    id: sampleID,
                    name: cell.name,
                    fromCell: null,
                    placedAt: []
                }
                this.placementState.samples[sampleID] = sample
                const cellSample = tubesWithoutParent.samples[sampleID] ?? {
                    selected: false
                }
                tubesWithoutParent.samples[sampleID] = cellSample
            }

            return
        } else {
            let container = this.placementState.realParentContainers[payload.parentContainerName]
            if (!container) {
                const [ axisRow = [''], axisCol = [''] ] = payload.spec
                const cells: RealParentContainerState['cells'] = {}
                for (const rowCoord of axisRow) {
                    for (const colCoord of axisCol) {
                        const coordinates = `${rowCoord}${colCoord}`
                        cells[coordinates] = {
                            fromContainer: { name: payload.parentContainerName },
                            coordinates,
                            samples: {},
                            preview: false
                        }
                    }
                }
                container = this.placementState.realParentContainers[payload.parentContainerName] = {
                    name: payload.parentContainerName,
                    cells,
                    spec: payload.spec
                }
            }
            const existingSampleIDs = new Set<SampleID>(payload.cells.map(c => c.sample))
            for (const cell of Object.values(container.cells)) {
                for (const sampleID of Object.keys(cell.samples).map(parseInt)) {
                    if (!existingSampleIDs.has(sampleID)) {
                        for (const cellID of this.placementState.samples[sampleID].placedAt) {
                            delete this.placementState.realParentContainers[cellID.fromContainer.name]?.cells[cellID.coordinates].samples[sampleID]
                        }
                        delete container.cells[cell.coordinates].samples[sampleID]
                        delete this.placementState.samples[sampleID]
                    }
                }
            }
            for (const cell of payload.cells) {
                const sampleID = cell.sample
                const sample = this.placementState.samples[sampleID] ?? {
                    containerName: payload.parentContainerName,
                    id: sampleID,
                    name: cell.name,
                    fromCell: {
                        fromContainer: { name: payload.parentContainerName },
                        coordinates: cell.coordinates
                    },
                    placedAt: []
                }
                this.placementState.samples[sampleID] = sample
                const cellSample = container.cells[cell.coordinates].samples[sampleID] ?? {
                    selected: false
                }
                container.cells[cell.coordinates].samples[sampleID] = cellSample
            }
        }
    }

    get placementType() {
        return this.placementState.placementType
    }
    set placementType(type: PlacementType) {
        this.placementState.placementType = type
    }
    get placementDirection() {
        return this.placementState.placementDirection
    }
    set placementDirection(direction: PlacementDirections) {
        this.placementState.placementDirection = direction
    }
    get error() {
        return this.placementState.error
    }
    set error(error) {
        this.placementState.error = error
    }
}

export class RealParentContainerClass extends PlacementObject {
    readonly state: RealParentContainerState

    constructor(context: PlacementContext, containerID: RealParentContainerIdentifier) {
        super(context.placementState, context)
        const state = context.placementState.realParentContainers[containerID.name]
        if (!state) {
            throw new Error(`Container ${containerID.name} not found in state`)
        }
        this.state = state
    }

    getCell(cellID: Pick<CellIdentifier, 'coordinates'>): CellClass {
        return new CellClass(this.context, { fromContainer: this, coordinates: cellID.coordinates })
    }

    placeSample(placement: SamplePlacementIdentifier) {
        const cell = this.getCell(placement.cell)
        new SampleClass(this.context, placement.sample).placeAtCell(cell)
    }
    placeAllSamples() {
        const sourceSamples: SampleClass[] = []
        const sourceContainer = this.context.sourceContainer
        if (sourceContainer instanceof TubesWithoutParentClass) {
            sourceSamples.push(...sourceContainer.getSortedSamples(true))
        } else if (sourceContainer instanceof RealParentContainerClass) {
            sourceSamples.push(...sourceContainer.getSortedPlacements(true))
        }

        let sampleIndex = 0
        const [ axisRow = [''], axisCol = [''] ] = this.spec
        // populate by column first
        for (const col of axisCol) {
            for (const row of axisRow) {
                const coordinates = `${row}${col}`
                const cell = this.getCell({ coordinates })
                if (sampleIndex >= sourceSamples.length) {
                    break
                }
                const sample = sourceSamples[sampleIndex]
                sample.placeAtCell(cell)
                sampleIndex++
            }
        }
    }
    unplaceSample(placedSample: SamplePlacementIdentifier) {
        const cell = this.getCell(placedSample.cell)
        new SampleClass(this.context, placedSample.sample).unplaceAtCell(cell, false)
    }

    isSampleSelected(placedSample: SamplePlacementIdentifier) {
        const placedSample_ = this.#resolveSamplePlacementIdentifier(placedSample)
        return `${placedSample_.sample.id}-${placedSample_.cell.coordinates}` in this.selections
    }
    selectSample(placedSample: SamplePlacementIdentifier) {
        const placedSample_ = this.#resolveSamplePlacementIdentifier(placedSample)
        this.selections[`${placedSample.sample.name}-${placedSample.cell.coordinates}`] = placedSample_
    }
    unSelectSample(placedSample: SamplePlacementIdentifier) {
        const placedSample_ = this.#resolveSamplePlacementIdentifier(placedSample)
        const key = `${placedSample_.sample.id}-${placedSample_.cell.coordinates}`
        if (key in this.selections) {
            delete this.selections[key]
        }
    }
    toggleSelections(...entries: SamplePlacementIdentifier[]) {
        const allSelected = entries.every(s => this.isSampleSelected(s))
        if (allSelected) {
            for (const entry of entries) {
                this.unSelectSample(entry)
            }
        } else {
            for (const entry of entries) {
                this.selectSample(entry)
            }
        }
    }

    clearPreviews() {
        for (const cell of Object.values(this.cells)) {
            if (cell.preview) {
                cell.preview = false
            }
        }
    }
    setPreviews(...placedSamples: SamplePlacementIdentifier[]) {
        this.clearPreviews()
        for (const placedSample of placedSamples) {
            const placedSample_ = this.#resolveSamplePlacementIdentifier(placedSample)
            placedSample_.cell.preview = true
        }
    }

    compareSamples(a_: SamplePlacementIdentifier, b_: SamplePlacementIdentifier) {
        const MAX = 128

        let orderA = MAX
        let orderB = MAX

        const a = this.#resolveSamplePlacementIdentifier(a_)
        const b = this.#resolveSamplePlacementIdentifier(b_)

        if (this.isSampleSelected(a)) orderA -= MAX / 2
        if (this.isSampleSelected(b)) orderB -= MAX / 2

        const aOffsets = coordinatesToOffsets(a.cell.fromContainer.spec, a.cell.coordinates)
        const bOffsets = coordinatesToOffsets(b.cell.fromContainer.spec, b.cell.coordinates)
        const arrayComparison = compareArray(aOffsets.reverse(), bOffsets.reverse())
        if (arrayComparison < 0) orderA -= MAX / 4
        if (arrayComparison > 0) orderB -= MAX / 4

        if (a.sample.name < b.sample.name) orderA -= MAX / 8
        if (a.sample.name > b.sample.name) orderB -= MAX / 8

        if (a.sample.projectName < b.sample.projectName) orderA -= MAX / 16
        if (a.sample.projectName > b.sample.projectName) orderB -= MAX / 16

        return orderA - orderB
    }

    placementDestinations(selections: SamplePlacement[], coordinates: Coordinates) {
        const [axisRow, axisCol] = this.spec
        const height = axisRow?.length ?? 1
        const width = axisCol?.length ?? 1

        const newOffsetsList: number[][] = []
        const destinationStartingOffsets = coordinatesToOffsets(this.spec, coordinates)

        switch (this.context.placement.placementType) {
            case PlacementType.PATTERN: {
                const sourceContainer = this.context.sourceContainer
                if (sourceContainer instanceof TubesWithoutParentClass) {
                    throw new Error(`Pattern placement is not supported for tubes without parent`)
                }

                const sourceOffsetsList = selections.map(({ cell }) => {
                    return coordinatesToOffsets(cell.fromContainer.spec, cell.coordinates)
                })

                // find top left corner that tightly bounds all of the selections
                const minOffsets = sourceOffsetsList.reduce((minOffsets, offsets) => {
                    return offsets.map((_, index) => offsets[index] < minOffsets[index] ? offsets[index] : minOffsets[index])
                }, sourceOffsetsList[0])

                for (const sourceOffsets of sourceOffsetsList) {
                    newOffsetsList.push(
                        this.spec.map(
                            (_: CoordinateAxis, index: number) => sourceOffsets[index] - minOffsets[index] + destinationStartingOffsets[index]
                        )
                    )
                }

                break
            }
            case PlacementType.GROUP: {
                const sourceContainer = this.context.sourceContainer

                const relativeOffsetByIndices = Object.keys(selections).sort((indexA, indexB) => {
                    const a = selections[indexA]
                    const b = selections[indexB]
                    return sourceContainer.compareSamples(a, b)
                }).reduce<Record<number, number>>((relativeOffsetByIndices, sortedIndex, index) => {
                    relativeOffsetByIndices[sortedIndex] = index
                    return relativeOffsetByIndices
                }, {})

                for (const sourceIndex in selections) {
                    const relativeOffset = relativeOffsetByIndices[sourceIndex]
                    const [startingRow, startingCol] = destinationStartingOffsets

                    const { ROW, COLUMN } = PlacementDirections
                    const finalOffsets = {
                        [ROW]: startingRow,
                        [COLUMN]: startingCol
                    }

                    if (this.context.placement.placementDirection === PlacementDirections.ROW) {
                        finalOffsets[COLUMN] += relativeOffset
                        const finalColBeforeWrap = finalOffsets[1]
                        if (finalColBeforeWrap >= width) {
                            finalOffsets[COLUMN] = finalColBeforeWrap % width
                            finalOffsets[ROW] += Math.floor(finalColBeforeWrap / width)
                        }
                    } else if (this.context.placement.placementDirection === PlacementDirections.COLUMN) {
                        finalOffsets[ROW] += relativeOffset
                        const finalRowBeforeWrap = finalOffsets[0]
                        if (finalRowBeforeWrap >= height) {
                            finalOffsets[ROW] = finalRowBeforeWrap % height
                            finalOffsets[COLUMN] += Math.floor(finalRowBeforeWrap / height)
                        }
                    }

                    newOffsetsList.push([finalOffsets[ROW], finalOffsets[COLUMN]])
                }
                break
            }
        }

        const results: CellClass[] = []
        for (const offsets of newOffsetsList) {
            try {
                results.push(this.getCell(offsetsToCoordinates(offsets, this.spec)))
            } catch (e) {
                this.context.placement.error ??= e.message
            }
        }
        return results
    }


    toString() {
        return `RealContainerParentClass(id=${this.id}, name=${this.name})`
    }

    #resolveSamplePlacementIdentifier(placedSample: SamplePlacementIdentifier): SamplePlacement {
        const cell = this.getCell(placedSample.cell)
        const sample = new SampleClass(this.context, placedSample.sample)
        return { sample, cell }
    }

    getSortedPlacements(onlySelected = false) {
        return Object.values(this.state.cells)
            .flatMap((cell) =>
                Object.keys(cell.samples)
                    .filter((id) => onlySelected ? cell.samples[Number(id)]?.selected : true)
                    .map((id) => ({ sample: { id: Number(id) }, cell }))
            )
            .sort((a, b) => {
                return this.compareSamples(a, b)
            })
            .map((id) => new SampleClass(this.context, { id: Number(id) }))
    }

    get name() {
        return this.state.name
    }
    get spec() {
        return this.state.spec
    }
}

class TubesWithoutParentClass extends PlacementObject {
    readonly state: TubesWithoutParentContainerState

    constructor(context: PlacementContext) {
        super(context.placementState, context)
        const state = context.placementState.tubesWithoutParentContainer
        if (!state) {
            throw new Error(`Tubes without parent container not found in state`)
        }
        this.state = state
    }

    isSampleSelected(sampleID: SampleIdentifier) {
        return this.#getStateForSample(sampleID).selected
    }
    selectSample(sampleID: SampleIdentifier) {
        if (sampleID.id in this.state.samples) {
            this.#getStateForSample(sampleID).selected = true
        }
    }
    unSelectSample(sampleID: SampleIdentifier) {
        if (sampleID.id in this.state.samples) {
            this.#getStateForSample(sampleID).selected = false
        }
    }
    toggleSelections(...sampleIDs: SampleIdentifier[]) {
        const allSelected = sampleIDs.every(s => this.isSampleSelected(s))
        if (allSelected) {
            for (const sampleID of sampleIDs) {
                this.unSelectSample(sampleID)
            }
        } else {
            for (const sampleID of sampleIDs) {
                this.selectSample(sampleID)
            }
        }
    }

    compareSamples(a: SampleClass, b: SampleClass) {
        const MAX = 128

        let orderA = MAX
        let orderB = MAX

        if (this.isSampleSelected(a)) orderA -= MAX / 2
        if (this.isSampleSelected(b)) orderB -= MAX / 2

        if (a.name < b.name) orderA -= MAX / 8
        if (a.name > b.name) orderB -= MAX / 8

        if (a.projectName < b.projectName) orderA -= MAX / 16
        if (a.projectName > b.projectName) orderB -= MAX / 16

        return orderA - orderB
    }

    toString() {
        return `TubesWithoutParent()`
    }

    #getStateForSample(sampleID: SampleIdentifier) {
        const sample = this.state.samples[sampleID.id]
        if (!sample) {
            throw new Error(`Sample ${sampleID.id} not found in state`)
        }
        return sample
    }


    getSortedSamples(onlySelected = false) {
        return Object.keys(this.state.samples)
            .filter((id) => onlySelected ? this.state.samples[Number(id)]?.selected : true)
            .map((id) => new SampleClass(this.context, { id: Number(id) }))
            .sort((a, b) => {
                return this.compareSamples(a, b)
            })
    }
}

class CellClass extends PlacementObject {
    readonly state: CellState

    constructor(context: PlacementContext, cellID: CellIdentifier) {
        super(context.placementState, context)
        const state = context.placementState.realParentContainers[cellID.fromContainer.name]?.cells[cellID.coordinates]
        if (!state) {
            throw new Error(`Cell ${cellID.coordinates} not found in container ${cellID.fromContainer.name}`)
        }
        this.state = state
    }

    click() {
        if (!this.context.sourceContainer) {
            throw new Error(`Source container is not set`)
        }
        if (this.fromContainer == this.context.sourceContainer) {
            // toggle selection in source container branch
            if (this.existingSample) {
                this.fromContainer.toggleSelections({ sample: this.existingSample, cell: this })
            }
            return
        }

        const selections: SamplePlacement[] = Object.values(this.context.sourceContainer.selections)
        if (selections.length > 0) {
            // placement branch
            const destinationCells = this.fromContainer.placementDestinations(
                selections,
                this.coordinates
            )
            if (destinationCells.length !== selections.length) {
                throw new Error(`Destination cells length does not match selections length`)
            }
            for (let i = 0; i < destinationCells.length; i++) {
                const cell = destinationCells[i]
                const sample = selections[i].sample
                this.fromContainer.placeSample({ sample, cell })
            }
        } else {
            // toggle selection in destination container branch
            this.fromContainer.toggleSelections(
                ...Object.values(this.placedFrom).map(s => ({ sample: s, cell: this }))
            )
            this.fromContainer.clearPreviews()
        }
    }

    enter() {
        if (!this.context.sourceContainer) {
            throw new Error(`Source container is not set`)
        }
        if (this.fromContainer == this.context.sourceContainer) {
            return
        }
        const selections: SamplePlacement[] = Object.values(this.context.sourceContainer.selections)
        this.fromContainer.setPreviews(...selections)
    }
    exit() {
        this.fromContainer.clearPreviews()
    }

    toString() {
        return `Cell(coordinates=${this.coordinates}, container=${this.fromContainer}, existingSample=${this.existingSample})`
    }

    isSampleSelected(sampleID: SampleIdentifier) {
        return sampleID.id in this.state.samples
    }

    placeSample(sampleID: SampleIdentifier, twoWayPlacement = true) {
        if (!this.state.samples[sampleID.id]) {
            this.state.samples[sampleID.id] = { selected: false }
        }

        if (twoWayPlacement) {
            new SampleClass(this.context, sampleID).placeAtCell(this, false)
        }
    }
    unplaceSample(sampleID: SampleIdentifier, twoWayPlacement = true) {
        if (this.state.samples[sampleID.id]) {
            delete this.state.samples[sampleID.id]
        }

        if (twoWayPlacement) {
            new SampleClass(this.context, sampleID).unplaceAtCell(this, false)
        }
    }

    get fromContainer() {
        return new RealParentContainerClass(this.context, this.state.fromContainer)
    }

    get coordinates() {
        return this.state.coordinates
    }
}

class SampleClass extends PlacementObject {
    readonly state: SampleState

    constructor(context: PlacementContext, sampleID: SampleIdentifier) {
        super(context.placementState, context)
        const state = context.placementState.samples[sampleID.id]
        if (!state) {
            throw new Error(`Sample ${sampleID.id} not found in state`)
        }
        this.state = state
    }

    placeAtCell(cellID: CellIdentifier, twoWayPlacement = true) {
        if (!this.state.placedAt.find(cell => cell.coordinates === cellID.coordinates)) {
            this.state.placedAt.push(cellID)
        }
        if (twoWayPlacement) {
            new CellClass(this.context, cellID).placeSample(this, false)
        }
    }
    unplaceAtCell(cellID: CellIdentifier, twoWayPlacement = true) {
        const index = this.state.placedAt.findIndex(cell => cell.coordinates === cellID.coordinates)
        if (index !== -1) {
            this.state.placedAt.splice(index, 1)
        }
        if (twoWayPlacement) {
            new CellClass(this.context, cellID).unplaceSample(this, false)
        }
    }

    toString() {
        return `Sample(id=${this.id}, container=${this.fromCell?.fromContainer}, cell=${this.fromCell})`
    }

    get id() {
        return this.state.id
    }
    get name() {
        return this.state.name
    }
    get projectName() {
        return this.state.projectName
    }
}

interface SamplePlacement { sample: SampleClass, cell: CellClass }
interface SamplePlacementIdentifier { sample: SampleIdentifier, cell: Pick<CellIdentifier, 'coordinates'> }