import { CoordinateSpec } from "../../models/fms_api_models"
import { PlacementDirections, PlacementType } from "./models"

class PlacementObject {
    placement: PlacementClass
}

class PlacementClass extends PlacementObject {
    containers: ContainerClass[]
    placementType: PlacementType
    placementDirection: PlacementDirections
    error: string | null | undefined

    // context
    sourceContainer: ContainerClass
    destinationContainer: ContainerClass | null

    findContainerByID(containerID: number): ContainerClass | null {
        return this.containers.find(c => c.id === containerID) ?? null
    }

    getContainerByID(containerID: number): ContainerClass {
        const container = this.findContainerByID(containerID)
        if (container) {
            return container
        } else {
            throw new Error(`Container with ID ${containerID} not found`)
        }
    }

    findSampleByID(sampleID: number): SampleClass | null {
        for (const container of this.containers) {
            const sample = container.findSampleByID(sampleID)
            if (sample) {
                return sample
            }
        }
        return null
    }

    getSampleByID(sampleID: number): SampleClass {
        const sample = this.findSampleByID(sampleID)
        if (sample) {
            return sample
        } else {
            throw new Error(`Sample with ID ${sampleID} not found`)
        }
    }
}

class ContainerClass extends PlacementObject {
    id: number
    name: string
    samples: SampleClass[]
    selectedSamples: SampleClass[]

    findSampleByID(sampleID: number): SampleClass | null {
        return this.samples.find(s => s.id === sampleID) ?? null
    }

    equals(other: ContainerClass): boolean {
        return this.id === other.id
    }

    isSelected(sampleID: number): boolean {
        return this.selectedSamples.some(s => s.id === sampleID)
    }

    isSource(): boolean {
        return this.placement.sourceContainer.equals(this)
    }
    isDestination(): boolean {
        return this.placement.destinationContainer?.equals(this) ?? false
    }
}

class RealContainerParentClass extends ContainerClass {
    cells: CellClass[]
    spec: CoordinateSpec
}

class TubesWithoutParentClass extends ContainerClass {
}

class CellClass extends PlacementObject {
    from: ContainerClass
    coordinates: string
    existingSample: SampleClass | null
    placed: SampleClass[]

    selectedSamples(): SampleClass[] {
        if (this.existingSample) {
            return this.from.selectedSamples.filter(s => s.id === this?.existingSample?.id)
        } else {
            return this.from.selectedSamples.reduce<SampleClass[]>((acc, s) => {
                if (this.placed.some(p => p.id === s.id)) {
                    acc.push(s)
                }
                return acc
            }, [])
        }
    }

    click() {
        const isDestination = this.placement.destinationContainer?.equals(this.from) ?? false
        if (this.from.isSource()) {
            if (this.existingSample) {
                if (this.from.isSelected(this.existingSample.id)) {
                    this.from.selectedSamples = this.from.selectedSamples.filter(s => s.id !== this?.existingSample?.id)
                } else {
                    this.from.selectedSamples.push(this.existingSample)
                }
            }
        } else if (this.from.isDestination()) {
            if 
        }

    }
}

class SampleClass extends PlacementObject {
    from: CellClass
    id: number
    placed: CellClass[]
    hightlight: boolean
}
