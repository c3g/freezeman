import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"
import { compareArray, coordinatesToOffsets } from "../../utils/functions"
import { PlacementDirections, PlacementType } from "./models"

class PlacementContext {
    // these fields are not set by default
    // so they need to be set ASAP
    placement: PlacementClass
    _sourceContainer: RealContainerParentClass | TubesWithoutParentClass
    destinationContainer: RealContainerParentClass | undefined

    // allows reusing the same instances
    // to allow comparing by reference
    containers: Record<number, ContainerClass> = {}
    cells: Record<string, CellClass> = {}
    samples: Record<number, SampleClass> = {}

    constructor(placement: PlacementClass) {
        this.placement = placement
    }
    setSourceContainer(containerID: number) {
        this._sourceContainer = ContainerClass.get(this, containerID)
    }
    setDestinationContainer(containerID?: number) {
        if (containerID === undefined) {
            this.destinationContainer = undefined
        } else {
            this.destinationContainer = RealContainerParentClass.get(this, containerID)
        }
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

    static create() {
        const placement = new PlacementClass()
        placement.containers = []
        placement.placementType = PlacementType.GROUP
        placement.placementDirection = PlacementDirections.COLUMN
        placement.context = new PlacementContext(placement)
        return placement
    }
}

class ContainerClass extends PlacementObject {
    selections: Set<PlacedSample> // tubes without parent samples will have undefined coordinates
    existingSamples: Set<SampleClass> // necessary for tubes without parent

    reduceAllSamples<T>(f: (acc: T, sample: SampleClass) => T, initial: T) {
        let acc = initial
        for (const sample of this.existingSamples) {
            acc = f(acc, sample)
        }
        if (this instanceof RealContainerParentClass) {
            for (const cell of this.cells) {
                for (const sample of cell.placed) {
                    acc = f(acc, sample)
                }
            }
        }
        return acc
    }
    isSampleSelected(entry: PlacedSampleIdentifier): boolean {
        for (const selection of this.selections) {
            if (selection.sample.id === entry.sample.id && selection.cell?.coordinates === entry.coordinates) {
                return true
            }
        }
        return false
    }
    selectSamples(entry: PlacedSampleIdentifier) {
        if (!this.isSampleSelected(entry)) {
            this.reduceAllSamples((acc, sample) => {
                if (sample.id === entry.sample.id) {
                    this.selections.add({
                        sample: sample,
                        cell: this instanceof RealContainerParentClass && entry.coordinates ? CellClass.getOrInstantiate(this.context, this, entry.coordinates) : undefined
                    })
                }
                return acc
            }, undefined)
        }
    }
    unSelectSamples(sampleID: PlacedSampleIdentifier) {
        this.selections = new Set([...this.selections].filter(s => {
            if (s.sample.id === sampleID.sample.id) {
                if (this instanceof RealContainerParentClass && sampleID.coordinates) {
                    return s.cell?.coordinates !== sampleID.coordinates
                }
                return false
            }
            return true
        }))
    }
    toggleSelected(...sampleIDs: PlacedSampleIdentifier[]) {
        const allSelected = sampleIDs.every(s => this.isSampleSelected(s))
        if (allSelected) {
            sampleIDs.forEach(id => this.unSelectSamples(id))
        } else {
            sampleIDs.forEach(id => this.selectSamples(id))
        }
    }

    compareSamples(a: PlacedSample, b: PlacedSample) {
        const MAX = 128

        let orderA = MAX
        let orderB = MAX
        
        if (this.isSampleSelected(a)) orderA -= MAX/2
        if (this.isSampleSelected(b)) orderB -= MAX/2

        if (a.cell && b.cell) {
            const aOffsets = coordinatesToOffsets(a.cell.fromContainer.spec, a.cell.coordinates)
            const bOffsets = coordinatesToOffsets(b.cell.fromContainer.spec, b.cell.coordinates)
            const arrayComparison = compareArray(aOffsets.reverse(), bOffsets.reverse())
            if (arrayComparison < 0) orderA -= MAX/4
            if (arrayComparison > 0) orderB -= MAX/4
        }

        if (a.name < b.name) orderA -= MAX/8
        if (a.name > b.name) orderB -= MAX/8
    
        if (a.projectName < b.projectName) orderA -= MAX/16
        if (a.projectName > b.projectName) orderB -= MAX/16
    
        return orderA - orderB    
    }

    static get(context: PlacementContext, containerID: number | null): ContainerClass {
        if (containerID === null) {
            return TubesWithoutParentClass.get(context)
        } else {
            return RealContainerParentClass.get(context, containerID)
        }
    }
}

class RealContainerParentClass extends ContainerClass {
    id: number
    name: string
    cells: CellClass[]
    spec: CoordinateSpec

    isSampleSelected(entry: PlacedSample): boolean {
        for (const selection of this.selections) {
            if (selection.sample.id === entry.sample.id && selection.cell.coordinates === entry.cell.coordinates) {
                return true
            }
        }
        return false
    }

    toString() {
        return `RealContainerParentClass(id=${this.id}, name=${this.name})`
    }

    static get(context: PlacementContext, containerID: number): RealContainerParentClass {
        if (context.containers[containerID]) {
            return context.containers[containerID] as RealContainerParentClass
        }
        throw new Error(`Container ${containerID} not found`)
    }
}

class TubesWithoutParentClass extends ContainerClass {

    toString() {
        return `TubesWithoutParent()`
    }

    static get(context: PlacementContext): TubesWithoutParentClass {
        if (context.containers[-1]) {
            return context.containers[-1] as TubesWithoutParentClass
        }
        throw new Error(`Tubes without parent not found`)
    }
}

class CellClass extends PlacementObject {
    fromContainer: RealContainerParentClass
    coordinates: string
    existingSample: SampleClass | null
    placed: SampleClass[]
    preview: boolean

    click() {
        if (!this.context.sourceContainer) {
            throw new Error(`Source container is not set`)
        }
        if (!this.context.destinationContainer) {
            throw new Error(`Destination container is not set`)
        }
        if (this.context.destinationContainer != this.fromContainer) {
            throw new Error(`Destination container is not the same as cell container.
                ${this.context.destinationContainer} != ${this.fromContainer}`)
        }
        if (this.fromContainer == this.context.sourceContainer) {
            if (this.existingSample) {
                this.fromContainer.toggleSelected(this.existingSample)
            }
        } else if (this.fromContainer == this.context.destinationContainer) {
            if (this.context.sourceContainer.selections.size > 0) {

            } else {
                this.fromContainer.toggleSelected(...this.placed)
            }
        }

    }

    #placementDestinations(
        sourceContainer: RealContainerParentClass | TubesWithoutParentClass,
        destinationContainer: RealContainerParentClass,
        startingCoordinates: string
    ) {
        if (destinationContainer != this.fromContainer) {
            throw new Error(`${this} is not in a destination container`)
        }

        const sourceSamples = [...this.context.sourceContainer.selections]
        if (sourceSamples.length === 0) {
            return []
        }

        const [axisRow, axisCol] = destinationContainer.spec
        const height = axisRow?.length ?? 1
        const width = axisCol?.length ?? 1

        const newOffsetsList: number[][] = []
        const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, startingCoordinates)

        switch (this.context.placement.placementType) {
            case PlacementType.PATTERN: {
                const sourceOffsetsList = sourceSamples.map((source) => {
                    if (!source.fromCell)
                        throw new Error(`For pattern placement, source sample ${source.id} must have a cell origin`)
                    return coordinatesToOffsets(source.fromCell.fromContainer.spec, source.fromCell.coordinates)
                })

                // find top left corner that tightly bounds all of the selections
                const minOffsets = sourceOffsetsList.reduce((minOffsets, offsets) => {
                    return offsets.map((_, index) => offsets[index] < minOffsets[index] ? offsets[index] : minOffsets[index])
                }, sourceOffsetsList[0])
    
    
                newOffsetsList.push(
                    ...sourceOffsetsList.map(
                        (sourceOffsets) => destinationContainer.spec.map(
                            (_: CoordinateAxis, index: number) => sourceOffsets[index] - minOffsets[index] + destinationStartingOffsets[index]
                        )
                    )
                )
    
                break
            }
            case PlacementType.GROUP: {
                const relativeOffsetByIndices = [...sourceSamples.keys()].sort((indexA, indexB) => {
                    const a = sourceSamples[indexA]
                    const b = sourceSamples[indexB]
                    return comparePlacementSamples(a, b, getContainer(state, a).spec)
                }).reduce<Record<number, number>>((relativeOffsetByIndices, sortedIndex, index) => {
                    relativeOffsetByIndices[sortedIndex] = index
                    return relativeOffsetByIndices
                }, {})

                for (const sourceIndex in sources) {
                    const relativeOffset = relativeOffsetByIndices[sourceIndex]
                    const [startingRow, startingCol] = destinationStartingOffsets

                    const { ROW, COLUMN } = PlacementDirections
                    const finalOffsets = {
                        [ROW]: startingRow,
                        [COLUMN]: startingCol
                    }

                    if (placementOptions.direction === PlacementDirections.ROW) {
                        finalOffsets[COLUMN] += relativeOffset
                        const finalColBeforeWrap = finalOffsets[1]
                        if (finalColBeforeWrap >= width) {
                            finalOffsets[COLUMN] = finalColBeforeWrap % width
                            finalOffsets[ROW] += Math.floor(finalColBeforeWrap / width)
                        }
                    } else if (placementOptions.direction === PlacementDirections.COLUMN) {
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
    }

    toString() {
        return `Cell(coordinates=${this.coordinates}, container=${this.fromContainer})`
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
    fromContainer: RealContainerParentClass | TubesWithoutParentClass
    fromCell: CellClass | null // null for TubesWithoutParent
    placedAt: CellClass[]
    hightlight: boolean

    toString() {
        return `Sample(id=${this.id}, container=${this.fromContainer}, cell=${this.fromCell})`
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

interface SampleIdentifier { id: number }
interface ContainerIdentifier { id?: number }
interface CellIdentifier { containerID: number, coordinates: Coordinates }

interface PlacedSample { sample: SampleClass, cell?: CellClass }
interface PlacedSampleIdentifier { sample: SampleIdentifier, coordinates?: Coordinates }