import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"
import { compareArray, coordinatesToOffsets, offsetsToCoordinates } from "../../utils/functions"
import { PlacementDirections, PlacementType } from "./models"

class PlacementContext {
    // these fields are not set by default
    // so they need to be set ASAP
    placement: PlacementClass
    _sourceContainer: RealContainerParentClass | TubesWithoutParentClass

    // allows reusing the same instances
    // to allow comparing by reference
    containers: Record<number, ContainerClass> = {}
    cells: Record<string, CellClass> = {}
    samples: Record<number, SampleClass> = {}

    constructor(placement: PlacementClass) {
        this.placement = placement
    }
    setSourceContainer(containerID: ContainerIdentifier) {
        this._sourceContainer = ContainerClass.get(this, containerID)
    }

    get sourceContainer() {
        if (!this._sourceContainer) {
            throw new Error(`Source container is not set`)
        }
        return this._sourceContainer
    }
}

class PlacementObject {
    context: PlacementContext
}

class PlacementClass extends PlacementObject {
    containers: ContainerClass[]
    placementType: PlacementType
    placementDirection: PlacementDirections
    error: string | null | undefined

    static instantiate() {
        const placement = new PlacementClass()
        placement.containers = []
        placement.placementType = PlacementType.GROUP
        placement.placementDirection = PlacementDirections.COLUMN
        placement.context = new PlacementContext(placement)
        return placement
    }
}

class ContainerClass extends PlacementObject {
    static get(context: PlacementContext, containerID: ContainerIdentifier) {
        if (containerID.id === undefined) {
            return TubesWithoutParentClass.get(context)
        } else {
            return RealContainerParentClass.get(context, containerID)
        }
    }
}

class RealContainerParentClass extends ContainerClass {
    id: number
    name: string
    cells: Record<Coordinates, CellClass>
    selections: Record<`${PlacedSampleIdentifier['sample']['id']}-${PlacedSampleIdentifier['cell']['coordinates']}`, PlacedSample>
    spec: CoordinateSpec

    getCell(coordinates: CellIdentifier['coordinates']): CellClass {
        const cell = this.cells[coordinates]
        if (!cell) {
            throw new Error(`Cell ${coordinates} not found in container ${this.name}`)
        }
        return cell
    }

    getPlacedSample(id: PlacedSampleIdentifier): PlacedSample {
        const cell = this.getCell(id.cell.coordinates)
        if (!cell) {
            throw new Error(`Cell ${id.cell.coordinates} not found in container ${this.name}`)
        }
        const sample = cell.placedFrom[id.sample.id]
        if (!sample) {
            throw new Error(`Sample ${id.sample.id} not found in cell ${cell.coordinates}`)
        }
        return { sample, cell }
    }
    placeSample(samplePlacement: PlacedSampleIdentifier | PlacedSample) {
        const cell = this.getCell(samplePlacement.cell.coordinates)
        const placedSample = SampleClass.getOrInstantiate(this.context, samplePlacement.sample)
        placedSample.placedAt[`${this.id}-${cell.coordinates}`] = cell
    }
    placeAllSamples(containerID: ContainerIdentifier) {
        const samples: SampleClass[] = []
        const sourceContainer = ContainerClass.get(this.context, containerID)
        if (sourceContainer instanceof TubesWithoutParentClass) {
            samples.push(...Object.values(sourceContainer.existingSamples))
            samples.sort((a, b) => sourceContainer.compareSamples(a, b))
        } else if (sourceContainer instanceof RealContainerParentClass) {
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
        this.selections[`${placedSample.sample.id}-${placedSample.cell.coordinates}`] = placedSample_
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

    static get(context: PlacementContext, containerID: ContainerIdentifier): RealContainerParentClass {
        if (!containerID.id) {
            throw new Error(`Container ID is not set`)
        }
        if (containerID.id <= 0) {
            throw new Error(`Container ID must be greater than 0`)
        }
        // TODO: create container from redux state if not exists
        if (context.containers[containerID.id]) {
            return context.containers[containerID.id] as RealContainerParentClass
        }
        throw new Error(`Container ${containerID.id} not found`)
    }

    #normalizePlacedSampleParam(placedSample: PlacedSample | PlacedSampleIdentifier): PlacedSample {
        const cell = this.getCell(placedSample.cell.coordinates)
        const sample = SampleClass.getOrInstantiate(this.context, placedSample.sample)
        return { sample, cell }
    }
}

class TubesWithoutParentClass extends ContainerClass {
    existingSamples: Record<SampleIdentifier['id'], SampleClass>
    selections: Record<SampleIdentifier['id'], SampleClass>

    getSample(sampleID: SampleIdentifier): SampleClass {
        if (sampleID.id in this.existingSamples) {
            return this.existingSamples[sampleID.id]
        }
        throw new Error(`Sample ${sampleID.id} not found in tubes without parent`)
    }

    isSampleSelected(sampleID: SampleIdentifier) {
        return sampleID.id in this.selections
    }
    selectSamples(...sampleIDs: SampleIdentifier[]) {
        for (const sampleID of sampleIDs) {
            const sample = this.getSample(sampleID)
            this.selections[sampleID.id] = sample
        }
    }
    unSelectSamples(...sampleIDs: SampleIdentifier[]) {
        for (const sampleID of sampleIDs) {
            if (sampleID.id in this.selections) {
                delete this.selections[sampleID.id]
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
        const TUBES_WITHOUT_PARENT_ID = 0

        // TODO: create container from redux state if not exists
        if (context.containers[TUBES_WITHOUT_PARENT_ID]) {
            return context.containers[TUBES_WITHOUT_PARENT_ID] as TubesWithoutParentClass
        }
        throw new Error(`Tubes without parent not found`)
    }
}

class CellClass extends PlacementObject {
    fromContainer: RealContainerParentClass
    coordinates: string
    existingSample: SampleClass | null
    placedFrom: Record<SampleIdentifier['id'], SampleClass>
    preview: boolean

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

    static getOrInstantiate(context: PlacementContext, container: RealContainerParentClass, coordinates: string): CellClass {
        const key = `${container.id}-${coordinates}`
        if (context.cells[key]) {
            return context.cells[key]
        }
        const cell = new CellClass()
        cell.context = context
        context.cells[coordinates] = cell
        return cell
    }
}

class SampleClass extends PlacementObject {
    id: number
    name: string
    projectName: string
    fromCell?: CellClass
    placedAt: Record<`${ContainerID}-${Coordinates}`, CellClass>

    toString() {
        return `Sample(id=${this.id}, container=${this.fromCell?.fromContainer}, cell=${this.fromCell})`
    }

    static getOrInstantiate(context: PlacementContext, sampleID: SampleIdentifier): SampleClass {
        if (context.samples[sampleID.id]) {
            return context.samples[sampleID.id]
        }
        const sample = new SampleClass()
        sample.context = context
        context.samples[sampleID.id] = sample
        return sample
    }
}

type Coordinates = string
interface PlacedSample { sample: SampleClass, cell: CellClass }
type ContainerID = number

interface ContainerIdentifier { id?: ContainerID }
interface SampleIdentifier { id: number }
interface CellIdentifier { fromContainer: Required<ContainerIdentifier>, coordinates: Coordinates }
interface PlacedSampleIdentifier { sample: SampleIdentifier, cell: Pick<CellIdentifier, 'coordinates'> }

