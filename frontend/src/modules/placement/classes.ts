import { Sample } from "../../models/frontend_models";
import { CellIdentifier, CellWithParentIdentifier, ContainerState, ParentContainerState, PlacementSampleState, PlacementState, TubesWithoutParentState } from "./models";
import { LoadContainerPayload, LoadParentContainerPayload, LoadTubesWithoutParentPayload } from "./reducers";

class PlacementClass {
    placement: PlacementState
    constructor(state: PlacementState) {
        this.placement = state
    }
    getPlacementState() {
        return this.placement
    }
    findParentContainer(name: string | null) {
        const container = this.placement.containers.find(c => c.name === name)
        if (container) {
            return ParentContainerClass.instantiate(this.placement, container)
        }
    }
    getParentContainer(name: string | null) {
        const container = this.findParentContainer(name)
        if (!container) {
            throw new Error(`Parent container ${name} not found`)
        }
        return container
    }
    findRealParentContainer(name: string) {
        const container = this.findParentContainer(name)
        if (container instanceof RealParentContainerClass) {
            return container
        }
    }
    findTubesWithoutParent() {
        const container = this.findParentContainer(null)
        if (container instanceof TubesWithoutParentClass) {
            return container
        }
    }
    findSample(id: Sample['id']) {
        const sample = this.placement.samples.find(s => s.id === id)
        if (sample) {
            return new SampleClass(sample)
        }
    }

    loadContainerFromPayload(payload: LoadContainerPayload) {
        return ParentContainerClass.fromPayload(this, payload)
    }
    loadSampleFromPayload(parentContainerName: string | null, payload: LoadContainerPayload['cells'][number]) {
        return SampleClass.fromPayload(this, parentContainerName, payload)
    }
    removeDisappearedSamples(parentContainerName: string | null) {
        this.placement.samples = this.placement.samples.filter(sample => {
            const container = this.findParentContainer(parentContainerName)
            if (!container) {
                return true
            }
            const cell = container.findCell(sample.location)
            if (!cell) {
                return false
            }
            if (cell.sample !== sample.id) {
                return false
            }
            return true
        })
    }
}

class SampleClass {
    placement: PlacementClass
    sample: PlacementSampleState
    constructor(sample: PlacementSampleState) {
        this.sample = sample
    }
    getSampleState() {
        return this.sample
    }
    static fromPayload(placement: PlacementClass, parentContainerName: string | null, payload: LoadContainerPayload['cells'][number]) {
        const existingSample = placement.findSample(payload.sample)
        if (existingSample) {
            return existingSample
        }
        const samplePayload: PlacementSampleState = {
            id: payload.sample,
            name: payload.name,
            project: payload.projectName,
            location: parentContainerName && payload.coordinates ? { parentContainerName, coordinates: payload.coordinates } : { sample: payload.sample },
            placedAt: [],
        }
        placement.getPlacementState().samples.push(samplePayload)
        return new SampleClass(samplePayload)
    }
}

class ParentContainerClass {
    placement: PlacementClass
    constructor(state: PlacementState) {
        this.placement = new PlacementClass(state)
    }
    getContainerState(): ContainerState {
        throw new Error('Must be implemented by subclass')
    }
    static instantiate(placement: PlacementState, container: ContainerState) {
        if (container.name !== null) {
            return new RealParentContainerClass(placement, container)
        } else {
            return new TubesWithoutParentClass(placement, container)
        }
    }
    static fromPayload(placement: PlacementClass, payload: LoadContainerPayload) {
        payload.cells.forEach((cell) => {
            placement.loadSampleFromPayload(payload.parentContainerName, cell)
        })
        let container: ParentContainerClass
        if (payload.parentContainerName !== null) {
            container = RealParentContainerClass.fromPayload(placement, payload)
        } else {
            container = TubesWithoutParentClass.fromPayload(placement, payload)
        }
        placement.removeDisappearedSamples(payload.parentContainerName)
    }
}

class RealParentContainerClass extends ParentContainerClass {
    container: ParentContainerState
    constructor(state: PlacementState, container: ParentContainerState) {
        super(state)
        this.container = container
    }
    getContainerState() {
        return this.container
    }
    findCell(identifier: CellWithParentIdentifier) {
        if ('sample' in identifier) {
            return this.container.cells.find(c => c.sample === identifier.sample)
        } else {
            return this.container.cells.find(c => c.parentContainerName === identifier.parentContainerName && c.coordinates === identifier.coordinates)
        }
    }
    static fromPayload(placement: PlacementClass, payload: LoadParentContainerPayload) {

    }
}

class TubesWithoutParentClass extends ParentContainerClass {
    container: TubesWithoutParentState
    constructor(state: PlacementState, container: TubesWithoutParentState) {
        super(state)
        this.container = container
    }
    getContainerState() {
        return this.container
    }
    findCell(identifier: CellIdentifier) {
        if ('sample' in identifier) {
            return this.container.cells.find(c => c.sample === identifier.sample)
        }
    }
    static fromPayload(placement: PlacementClass, payload: LoadTubesWithoutParentPayload) {
        let containerState = placement.findTubesWithoutParent()?.getContainerState()
        if (!containerState) {
            containerState = {
                name: null,
                spec: [],
                cells: payload.cells.map(cell => ({
                    selected: false,
                    sample: cell.sample,
                }))
            }
        }
    }
}