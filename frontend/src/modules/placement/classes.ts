import { Sample } from "../../models/frontend_models";
import { CellIdentifier, CellWithParentIdentifier, ContainerIdentifier, ParentContainerState, RealParentContainerState, PlacementSampleState, PlacementState, TubesWithoutParentState, RealParentContainerIdentifier, SampleIdentifier, CellState } from "./models";
import { LoadContainerPayload, LoadParentContainerPayload, LoadTubesWithoutParentPayload, MouseOnCellPayload } from "./reducers";

class PlacementClass {
    placement: PlacementState
    constructor(state: PlacementState) {
        this.placement = state
    }
    getPlacementState() {
        return this.placement
    }
    findParentContainer(id: ContainerIdentifier) {
        const container = this.placement.containers.find(c => c.name === id.name)
        if (container) {
            return ParentContainerClass.instantiate(this.placement, container)
        }
    }
    getParentContainer(id: ContainerIdentifier) {
        const container = this.findParentContainer(id)
        if (!container) {
            throw new Error(`Parent container ${id} not found`)
        }
        return container
    }
    findRealParentContainer(id: RealParentContainerIdentifier) {
        const container = this.findParentContainer(id)
        if (container instanceof RealParentContainerClass) {
            return container
        }
    }
    findTubesWithoutParent() {
        const container = this.findParentContainer({ name: null })
        if (container instanceof TubesWithoutParentClass) {
            return container
        }
    }
    findSample(id: SampleIdentifier) {
        const sample = this.placement.samples.find(s => s.id === id.id)
        if (sample) {
            return new SampleClass(this, sample)
        }
    }

    loadContainerFromPayload(payload: LoadContainerPayload) {
        return ParentContainerClass.fromPayload(this, payload)
    }
}

class SampleClass {
    placement: PlacementClass
    sample: PlacementSampleState
    constructor(placement: PlacementClass, sample: PlacementSampleState) {
        this.placement = placement
        this.sample = sample
    }
    getSampleState() {
        return this.sample
    }
    static fromPayload(placement: PlacementClass, parentContainerID: ContainerIdentifier, payload: LoadContainerPayload['cells'][number]) {
        const existingSample = placement.findSample({ id: payload.sample })
        if (existingSample) {
            const state = existingSample.getSampleState()
            state.location = parentContainerID.name !== null && payload.coordinates !== undefined ? {
                parentContainerName: parentContainerID.name,
                coordinates: payload.coordinates,
                sample: payload.sample
            } : {
                sample: payload.sample
            }
            return existingSample
        }
        const samplePayload: PlacementSampleState = {
            id: payload.sample,
            name: payload.name,
            project: payload.projectName,
            location: parentContainerID.name !== null && payload.coordinates !== undefined ? {
                parentContainerName: parentContainerID.name,
                coordinates: payload.coordinates,
                sample: payload.sample
            } : {
                sample: payload.sample
            },
            placedAt: [],
        }
        placement.getPlacementState().samples.push(samplePayload)
        return new SampleClass(placement, samplePayload)
    }
}

class CellClass {
    placement: PlacementClass
    cell: CellState
    constructor(placement: PlacementClass, cell: CellState) {
        this.placement = placement
        this.cell = cell
    }
    get sample() {
        return this.cell.sample
    }
    getCellState() {
        return this.cell
    }
    isSelectable(isSource: boolean) {
        if (isSource) {
            return this.cell.sample !== null
        } else {
            return this.cell.sample === null && this.placement.getPlacementState().samples.find(s => s.placedAt.find(p => p.parentContainerName === this.cell.parentContainerName && p.coordinates === this.cell.coordinates))
        }
    }
}

class ParentContainerClass {
    placement: PlacementClass
    constructor(state: PlacementState) {
        this.placement = new PlacementClass(state)
    }
    getContainerState(): ParentContainerState {
        throw new Error('Must be implemented by subclass')
    }
    static instantiate(placement: PlacementState, container: ParentContainerState) {
        if (container.name !== null) {
            return new RealParentContainerClass(placement, container)
        } else {
            return new TubesWithoutParentClass(placement, container)
        }
    }
    findCell(identifier: CellIdentifier) {
        const containerState = this.getContainerState()
        let cell: CellState | undefined
        if ('parentContainerName' in identifier) {
            cell = containerState.cells.find(c => c.parentContainerName === identifier.parentContainerName && c.coordinates === identifier.coordinates)
        } else {
            cell = containerState.cells.find(c => c.sample === identifier.sample)
        }
        if (cell) {
            return new CellClass(this.placement, cell)
        }
    }
    static fromPayload(placement: PlacementClass, payload: LoadContainerPayload) {
        payload.cells.forEach((cell) => {
            SampleClass.fromPayload(placement, { name: payload.parentContainerName }, cell)
        })
        let container: ParentContainerClass
        if (payload.parentContainerName !== null) {
            container = RealParentContainerClass.fromPayload(placement, payload)
        } else {
            container = TubesWithoutParentClass.fromPayload(placement, payload)
        }
        container.#removeDisappearedSamples()
    }
    #removeDisappearedSamples() {
        const placementState = this.placement.getPlacementState()
        const containerState = this.getContainerState()
        placementState.samples = placementState.samples.filter(sample => {
            if ('parentContainerName' in sample.location) {
                if (sample.location.parentContainerName === containerState.name) {
                    return true
                }
            } else if (containerState.name !== null) {
                return true
            }
            const cell = this.findCell(sample.location)
            if (cell?.sample === sample.id) {
                return true
            }
            placementState.containers.forEach(container => {
                container.cells.forEach(cell => {
                    cell.placedFrom = cell.placedFrom.filter(id => id !== sample.id)
                    if (cell.placedFrom.length === 0) {
                        cell.selected = false
                    }
                })
            })
            return false
        })
    }
}

class RealParentContainerClass extends ParentContainerClass {
    container: RealParentContainerState
    constructor(state: PlacementState, container: RealParentContainerState) {
        super(state)
        this.container = container
    }
    getContainerState() {
        return this.container
    }
    clickCell(clickedLocation: MouseOnCellPayload) {
        const 
    }
    static fromPayload(placement: PlacementClass, payload: LoadParentContainerPayload) {
        const containerState: RealParentContainerState = {
            name: payload.parentContainerName,
            spec: payload.spec,
            cells: payload.cells.map(cell => ({
                parentContainerName: payload.parentContainerName,
                coordinates: cell.coordinates,
                sample: cell.sample,
                selected: false,
                preview: false,
                placedFrom: [],
            }))
        }
        const existingContainer = placement.findRealParentContainer({ name: payload.parentContainerName })
        if (existingContainer) {
            const state = existingContainer.getContainerState()
            state.cells = containerState.cells
            return existingContainer
        } else {
            placement.getPlacementState().containers.push(containerState)
            return new RealParentContainerClass(placement.getPlacementState(), containerState)
        }
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
    static fromPayload(placement: PlacementClass, payload: LoadTubesWithoutParentPayload) {
        const containerState: TubesWithoutParentState = {
            name: null,
            spec: [],
            cells: payload.cells.map(cell => ({
                parentContainerName: null,
                selected: false,
                sample: cell.sample,
            }))
        }
        const existingContainer = placement.findTubesWithoutParent()
        if (existingContainer) {
            const state = existingContainer.getContainerState()
            state.cells = containerState.cells
            return existingContainer
        } else {
            placement.getPlacementState().containers.push(containerState)
            return new TubesWithoutParentClass(placement.getPlacementState(), containerState)
        }
    }
}