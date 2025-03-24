import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"
import { coordinatesToOffsets } from "../../utils/functions"
import { PlacementDirections, PlacementType } from "./models"

class PlacementObject {
    placement: PlacementClass

    // action context
    sourceContainer: RealContainerParentClass | TubesWithoutParentClass
    destinationContainer: RealContainerParentClass | null
}

class PlacementClass extends PlacementObject {
    containers: ContainerClass[]
    placementType: PlacementType
    placementDirection: PlacementDirections
    error: string | null | undefined
}

class ContainerClass extends PlacementObject {
    id: number
    name: string
    samples: SampleClass[]
    selectedSamples: SampleClass[]

    equals(other: ContainerClass): boolean {
        return this.id === other.id
    }

    findSample(sampleID: SampleIdentifier) {
        if ('id' in sampleID) {
            return this.samples.find(s => s.id === sampleID.id)
        } else {
            return this.samples.find(s => s.fromCell?.coordinates === sampleID.coordinates
                && s.fromCell?.fromContainer.name === sampleID.parentContainerName)
        }
    }
    getSample(sampleID: SampleIdentifier) {
        const sample = this.findSample(sampleID)
        if (!sample) {
            throw new Error(`Sample with ID ${sampleID} not found in container ${this.id}`)
        }
        return sample
    }
    isSampleSelected(sample: SampleClass): boolean {
        return this.selectedSamples.some(s => s.equals(sample))
    }
    selectSample(sample: SampleClass) {
        if (!this.isSampleSelected(sample)) {
            this.selectedSamples.push(sample)
        }
    }
    unSelectSample(sample: SampleClass) {
        this.selectedSamples = this.selectedSamples.filter(s => s.equals(sample))
    }
    toggleSelected(...samples: SampleClass[]) {
        const allSelected = samples.every(s => this.isSampleSelected(s))
        if (allSelected) {
            samples.forEach(id => this.unSelectSample(id))
        } else {
            samples.forEach(id => this.selectSample(id))
        }
    }

    isSource(): boolean {
        return this.sourceContainer.equals(this)
    }
    isDestination(): boolean {
        return this.destinationContainer?.equals(this) ?? false
    }
}

class RealContainerParentClass extends ContainerClass {
    cells: CellClass[]
    spec: CoordinateSpec
}

class TubesWithoutParentClass extends ContainerClass {
}

class CellClass extends PlacementObject {
    fromContainer: RealContainerParentClass
    coordinates: string
    existingSample: SampleClass | null
    placed: SampleClass[]
    preview: boolean

    click() {
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

    #placementDestinations() {
        if (!this.destinationContainer?.equals(this.fromContainer)) {
            return []
        }

        const destinationContainer = this.destinationContainer
        const sourceSamples = this.sourceContainer.selectedSamples

        const [axisRow, axisCol] = destinationContainer.spec
        const height = axisRow?.length ?? 1
        const width = axisCol?.length ?? 1

        const newOffsetsList: number[][] = []
        const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, destination.coordinates)


        switch (this.placement.placementType) {
            case PlacementType.PATTERN: {
                const sourceOffsetsList = sourceSamples.map((source) => {
                    const parentContainer = source.fromContainer
                    const coordinates = source?.fromCell?.coordinates
                    if (parentContainer instanceof TubesWithoutParentClass || !coordinates)
                        throw new Error(`For pattern placement, source cell must be in a parent container`)
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
                break
            }
        }
    }
}

class SampleClass extends PlacementObject {
    fromContainer: RealContainerParentClass | TubesWithoutParentClass
    fromCell: CellClass | null // null for TubesWithoutParent
    id: number
    placed: CellClass[]
    hightlight: boolean

    equals(other: SampleClass): boolean {
        return this.id === other.id
    }
}

type SampleIdentifier = { id: number } | { coordinates: string, parentContainerName: string }