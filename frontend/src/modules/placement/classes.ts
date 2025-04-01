import { TUBES_WIHOUT_PARENT_NAME } from "../../constants"
import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"
import { compareArray, coordinatesToOffsets, offsetsToCoordinates } from "../../utils/functions"
import { CellIdentifier, RealParentContainerIdentifier, ContainerName, Coordinates, PlacementDirections, PlacementState, PlacementType, RealParentContainerState, SampleID, SampleIdentifier, SampleName, TubesWithoutParentContainerState } from "./models"
import { LoadContainerPayload } from "./reducers"

class PlacementContext {
    // these fields are not set by default
    // so they need to be set ASAP
    _sourceContainer: RealParentContainerClass | TubesWithoutParentClass
    _destinationContainer: RealParentContainerClass

    setSourceContainer(containerID?: RealParentContainerIdentifier) {
        this._sourceContainer = containerID ? RealParentContainerClass.get(this, containerID) : TubesWithoutParentClass.get(this)
    }
    setDestinationContainer(containerID: RealParentContainerIdentifier) {
        this._destinationContainer = RealParentContainerClass.get(this, containerID)
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
}

class PlacementClass extends PlacementObject {
    static instantiate(state: PlacementState) {
        const placement = new PlacementClass()
        placement.context = new PlacementContext()
        placement.placementState = state
        return placement
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
                    cells
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

class RealParentContainerClass extends PlacementObject {
    readonly containerID: RealParentContainerIdentifier
    constructor(containerID: RealParentContainerIdentifier) {
        super()
        this.containerID = containerID
    }

    getCell(coordinates: CellIdentifier['coordinates']): CellClass {
        return CellClass.get(this.placementState, this, coordinates)
    }

    getPlacedSample(id: PlacedSampleIdentifier): PlacedSample {
        const cell = this.getCell(id.cell.coordinates)
        if (!cell) {
            throw new Error(`Cell ${id.cell.coordinates} not found in container ${this.name}`)
        }
        const sample = cell.placedFrom[id.sample.name]
        if (!sample) {
            throw new Error(`Sample ${id.sample.name} not found in cell ${cell.coordinates}`)
        }
        return { sample, cell }
    }
    placeSample(samplePlacement: PlacedSampleIdentifier | PlacedSample) {
        const cell = this.getCell(samplePlacement.cell.coordinates)
        const placedSample = SampleClass.get(this.context, samplePlacement.sample)
        placedSample.placedAt[`${this.id}-${cell.coordinates}`] = cell
    }
    placeAllSamples(containerID: RealParentContainerIdentifier) {
        const samples: SampleClass[] = []
        const sourceContainer = ContainerClass.get(this.context, containerID)
        if (sourceContainer instanceof TubesWithoutParentClass) {
            samples.push(...Object.values(sourceContainer.existingSamples))
            samples.sort((a, b) => sourceContainer.compareSamples(a, b))
        } else if (sourceContainer instanceof RealParentContainerClass) {
            samples.push(
                ...Object.values(sourceContainer.selections)
                    .sort((a, b) => sourceContainer.compareSamples(a, b))
                    .map(s => s.sample)
            )
        }
        for (const sample of samples) {
            const cell = this.getCell(sample.fromCell?.coordinates ?? '')
            if (cell) {
                this.placeSample({ sample, cell })
            }
        }
    }
    unplaceSample(placedSample: PlacedSampleIdentifier | PlacedSample) {
        const placedSample_ = this.#normalizePlacedSampleParam(placedSample)
        const cell = placedSample_.cell
        if (cell.fromContainer != this) {
            throw new Error(`Cell ${cell.coordinates} is not in container ${this.name}`)
        }
        
        const sample = placedSample_.sample
        if (!placedSample) {
            throw new Error(`Sample ${sample.id} not found in cell ${cell.coordinates}`)
        }
        delete cell.placedFrom[sample.id]
        delete sample.placedAt[`${this.id}-${cell.coordinates}`]
    }

    isSampleSelected(placedSample: PlacedSampleIdentifier | PlacedSample) {
        const placedSample_ = this.#normalizePlacedSampleParam(placedSample)
        return `${placedSample_.sample.id}-${placedSample_.cell.coordinates}` in this.selections
    }
    selectSample(placedSample: PlacedSampleIdentifier | PlacedSample) {
        const placedSample_ = this.#normalizePlacedSampleParam(placedSample)
        this.selections[`${placedSample.sample.name}-${placedSample.cell.coordinates}`] = placedSample_
    }
    unSelectSample(placedSample: PlacedSampleIdentifier | PlacedSample) {
        const placedSample_ = this.#normalizePlacedSampleParam(placedSample)
        const key = `${placedSample_.sample.id}-${placedSample_.cell.coordinates}`
        if (key in this.selections) {
            delete this.selections[key]
        }
    }
    toggleSelections(...entries: (PlacedSampleIdentifier | PlacedSample)[]) {
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
    setPreviews(...placedSamples: (PlacedSampleIdentifier | PlacedSample)[]) {
        this.clearPreviews()
        for (const placedSample of placedSamples) {
            const placedSample_ = this.#normalizePlacedSampleParam(placedSample)
            placedSample_.cell.preview = true
        }
    }

    compareSamples(a: PlacedSample, b: PlacedSample) {
        const MAX = 128

        let orderA = MAX
        let orderB = MAX

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

    placementDestinations(selections: PlacedSample[], coordinates: Coordinates) {
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

    static get(context: PlacementContext, containerID: RealParentContainerIdentifier): RealParentContainerClass {
        let container = context.realParentContainers.get(containerID.name)
        if (!container) {
            container = new RealParentContainerClass(containerID)
            container.context = context
            context.realParentContainers.set(containerID.name, container)
        }
        return container
    }

    #normalizePlacedSampleParam(placedSample: PlacedSample | PlacedSampleIdentifier): PlacedSample {
        const cell = this.getCell(placedSample.cell.coordinates)
        const sample = SampleClass.get(this.context, placedSample.sample)
        return { sample, cell }
    }
}

class TubesWithoutParentClass extends PlacementObject {
    getSample(sampleID: SampleIdentifier): SampleClass {
        if (sampleID.name in this.existingSamples) {
            return this.existingSamples[sampleID.name]
        }
        throw new Error(`Sample ${sampleID.name} not found in tubes without parent`)
    }

    isSampleSelected(sampleID: SampleIdentifier) {
        return sampleID.name in this.selections
    }
    selectSamples(...sampleIDs: SampleIdentifier[]) {
        for (const sampleID of sampleIDs) {
            const sample = this.getSample(sampleID)
            this.selections[sampleID.name] = sample
        }
    }
    unSelectSamples(...sampleIDs: SampleIdentifier[]) {
        for (const sampleID of sampleIDs) {
            if (sampleID.name in this.selections) {
                delete this.selections[sampleID.name]
            }
        }
    }
    toggleSelections(...sampleIDs: SampleIdentifier[]) {
        const allSelected = sampleIDs.every(s => this.isSampleSelected(s))
        if (allSelected) {
            this.unSelectSamples(...sampleIDs)
        } else {
            this.selectSamples(...sampleIDs)
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

    static get(context: PlacementContext): TubesWithoutParentClass {
        if (context.tubesWithoutParentContainer) {
            return context.tubesWithoutParentContainer
        }
        const tubesWithoutParent = new TubesWithoutParentClass()
        tubesWithoutParent.context = context
        context.tubesWithoutParentContainer = tubesWithoutParent
        return tubesWithoutParent
    }
}

class CellClass extends PlacementObject {
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

        const selections: PlacedSample[] = Object.values(this.context.sourceContainer.selections)
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
        const selections: PlacedSample[] = Object.values(this.context.sourceContainer.selections)
        this.fromContainer.setPreviews(...selections)
    }
    exit() {
        this.fromContainer.clearPreviews()
    }

    toString() {
        return `Cell(coordinates=${this.coordinates}, container=${this.fromContainer}, existingSample=${this.existingSample})`
    }

    static get(state: PlacementState, container: RealParentContainerClass, coordinates: string): CellClass {
    }
}

class SampleClass extends PlacementObject {
    toString() {
        return `Sample(id=${this.id}, container=${this.fromCell?.fromContainer}, cell=${this.fromCell})`
    }

    static get(context: PlacementContext, sampleID: SampleIdentifier): SampleClass {
        if (context.samples[sampleID.name]) {
            return context.samples[sampleID.name]
        }
        const sample = new SampleClass()
        sample.context = context
        context.samples[sampleID.name] = sample
        return sample
    }
}

interface PlacedSample { sample: SampleClass, cell: CellClass }
interface PlacedSampleIdentifier { sample: SampleIdentifier, cell: Pick<CellIdentifier, 'coordinates'> }