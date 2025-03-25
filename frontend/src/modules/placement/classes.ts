import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"
import { coordinatesToOffsets } from "../../utils/functions"
import { PlacementDirections, PlacementType } from "./models"

class PlacementContext {
    // these fields are not set by default
    // so they need to be set ASAP
    placement: PlacementClass
    sourceContainer: RealContainerParentClass | TubesWithoutParentClass
    destinationContainer: RealContainerParentClass
}

class PlacementObject {
    context = new PlacementContext()   
}

class PlacementClass extends PlacementObject {
    containers: ContainerClass[]
    placementType: PlacementType
    placementDirection: PlacementDirections
    error: string | null | undefined

    constructor() {
        super()
        this.context.placement = this
    }
}

class ContainerClass extends PlacementObject {
    existingSamples: SampleClass[] // necessary for tubes without parent
    selectedSamples: SampleClass[] // includes existing and placed samples

    findSamples(sampleID: SampleIdentifier, onlyExisting = true) {
        const samples = sampleIdentifier(
            sampleID,
            id => this.existingSamples.filter(s => s.id === id),
            (coordinates, parentContainerName) => this.existingSamples.filter(
                s => s.fromCell?.coordinates === coordinates &&
                s.fromCell?.fromContainer.name === parentContainerName
            )
        )
        if (!onlyExisting) {
            if (this instanceof RealContainerParentClass) {
                for (const cell of this.cells) {
                    const placed = sampleIdentifier(
                        sampleID,
                        id => cell.placed.filter(s => s.id === id),
                        (coordinates, parentContainerName) => cell.coordinates === coordinates ? cell.placed : null
                    )
                    if (placed) {
                        samples.push(...placed)
                    }
                }
            }
        }
        return samples
    }
    isSampleSelected(sampleID: SampleIdentifier): boolean {
        return sampleIdentifier(
            sampleID,
            id => this.selectedSamples.some(s => s.id === id),
            (coordinates, parentContainerName) => this.selectedSamples.some(
                s => s.fromCell?.coordinates === coordinates &&
                s.fromCell?.fromContainer.name === parentContainerName
            )
        )
    }
    selectSamples(sampleID: SampleIdentifier) {
        if (!this.isSampleSelected(sampleID)) {
            const samples = this.findSamples(sampleID)
            this.selectedSamples = [...new Set([...this.selectedSamples, ...samples])]
        }
    }
    unSelectSamples(sampleID: SampleIdentifier) {
        sampleIdentifier(
            sampleID,
            id => this.selectedSamples = this.selectedSamples.filter(s => s.id !== id),
            (coordinates, parentContainerName) => this.selectedSamples = this.selectedSamples.filter(
                s => !(
                    s.fromCell?.coordinates === coordinates &&
                    s.fromCell?.fromContainer.name === parentContainerName
                )
            )
        )
    }
    toggleSelected(...sampleIDs: SampleIdentifier[]) {
        const allSelected = sampleIDs.every(s => this.isSampleSelected(s))
        if (allSelected) {
            sampleIDs.forEach(id => this.unSelectSamples(id))
        } else {
            sampleIDs.forEach(id => this.selectSamples(id))
        }
    }

    compareSamples(a: SampleClass, b: SampleClass) {
        const MAX = 128

        let orderA = MAX
        let orderB = MAX
        
        if (this.isSampleSelected(a)) orderA -= MAX/2
        if (this.isSampleSelected(b)) orderB -= MAX/2

        if (this instanceof RealContainerParentClass) {
            const aCell = this.getCell(a)
        }
    }
}

class RealContainerParentClass extends ContainerClass {
    id: number
    name: string
    cells: CellClass[]
    spec: CoordinateSpec

    findCell(cellID: SampleIdentifier) {
        if ('id' in cellID) {
            return this.cells.find(c => c.existingSample?.id === cellID.id)
        } else {
            return this.cells.find(c => c.coordinates === cellID.coordinates)
        }
    }
    getCell(cellID: SampleIdentifier) {
        const cell = this.findCell(cellID)
        if (!cell) {
            throw new Error(`Cell with coordinates ${cellID} not found in container ${this.id}`)
        }
        return cell
    }

    toString() {
        return `RealContainerParentClass(id=${this.id}, name=${this.name})`
    }
}

class TubesWithoutParentClass extends ContainerClass {
    toString() {
        return `TubesWithoutParent()`
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
        if (this.fromContainer.isSource()) {
            if (this.existingSample) {
                this.fromContainer.toggleSelected(this.existingSample)
            }
        } else if (this.fromContainer.isDestination()) {
            if (this.sourceContainer.selectedSamples.length > 0) {

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

        const sourceSamples = this.context.sourceContainer.selectedSamples

        if (sourceSamples.length === 0) {
            return []
        }

        const [axisRow, axisCol] = destinationContainer.spec
        const height = axisRow?.length ?? 1
        const width = axisCol?.length ?? 1

        const newOffsetsList: number[][] = []
        const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, startingCoordinates)

        switch (this.placement.placementType) {
            case PlacementType.PATTERN: {
                const sourceOffsetsList = sourceSamples.map((source) => {
                    const parentContainer = source.fromContainer
                    if (parentContainer instanceof TubesWithoutParentClass)
                        throw new Error(`For pattern placement, source cell must be in a parent container`)
                    const coordinates = source?.fromCell?.coordinates
                    if (!coordinates)
                        throw new Error(`For pattern placement, source cell ${source.id} in ${source.fromContainer} must have coordinates`)
                    return coordinatesToOffsets(parentContainer.spec, coordinates)
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
}

class SampleClass extends PlacementObject {
    fromContainer: RealContainerParentClass | TubesWithoutParentClass
    fromCell: CellClass | null // null for TubesWithoutParent
    id: number
    placed: CellClass[]
    hightlight: boolean

    toString() {
        return `Sample(id=${this.id}, container=${this.fromContainer}, cell=${this.fromCell})`
    }
}

type SampleIdentifier = { id: number } | { coordinates: string, parentContainerName: string }
function sampleIdentifier<T>(identifier: SampleIdentifier, id: (id: number) => T, location: (coordinates: string, parentContainerName: string) => T) {
    if ('id' in identifier) {
        return id(identifier.id)
    } else {
        return location(identifier.coordinates, identifier.parentContainerName)
    }
}
