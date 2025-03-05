import { CellIdentifier, ParentContainerIdentifier, ParentContainerState, PlacementState, RealParentContainerIdentifier, RealParentContainerState, SampleDetail, SampleIdentifier } from "./models";
import { initialState, LoadContainerPayload, LoadParentContainerPayload, selectParentContainer } from "./helpers";

class Placement {
    state: PlacementState
    constructor(state: PlacementState) {
        this.state = state
    }
    selectParentContainer(location: ParentContainerIdentifier) {
        const container = this.state.parentContainers.find(container => container.name === location.parentContainer)
        if (container) {
            return new ParentContainer(this, container)
        } else {
            return null
        }
    }
    getParentContainer(location: ParentContainerIdentifier) {
        const container = this.selectParentContainer(location)
        if (!container) {
            throw new Error(`Parent container ${location.parentContainer} not found`)
        }
        return container
    }
    getRealParentContainer(location: RealParentContainerIdentifier) {
        const container = this.getParentContainer(location)
        return container
    }
    getTubesWithoutParent() {
        const container = this.getParentContainer({ parentContainer: null })
        return container
    }
    loadContainer(payload: LoadContainerPayload) {
        const parentContainer = this.#getOrCreateParentContainer(
            payload.parentContainerName ? initialParentContainerState(payload) : { name: null, existingSamples: [] }
        )

        // Update or Add samples
        const payloadSampleIDs: Set<SampleIdentifier> = new Set()
        for (const payloadCell of payload.cells) {
            payloadSampleIDs.add(payloadCell.sample)

            let payloadSample: SampleDetail
            if (payloadCell.coordinates) {
                // with parent container
                payloadSample = {
                    name: payloadCell.name,
                    project: payloadCell.projectName,
                    id: payloadCell.sample,
                    parentContainer: payloadCell.name,
                    container: payloadCell.container,
                    coordinates: payloadCell.coordinates,
                    highlight: false,
                    volume: payload.volume,
                }
            } else {
                // without parent container
                payloadSample = {
                    name: payloadCell.name,
                    project: payloadCell.projectName,
                    id: payloadCell.sample,
                    parentContainer: null,
                    container: payloadCell.container,
                    coordinates: null,
                    highlight: false,
                    volume: payload.volume,
                }
            }
        }
    }
    #getOrCreateParentContainer(parentContainer: ParentContainerState) {
        const foundContainer = this.selectParentContainer({ parentContainer: parentContainer.name })
        if (foundContainer) {
            return foundContainer
        } else {
            this.state.parentContainers.push(parentContainer)
            return new ParentContainer(this, parentContainer)
        }    
    }
}

class ParentContainer {
    placement: Placement
    state: ParentContainerState
    constructor(placement: Placement, state: ParentContainerState) {
        this.placement = placement
        this.state = state
    }
    get name() {
        return this.state.name
    }
    get cells() {
        if (this.state.name === null) {
            throw new Error(`ParentContainer.cells: Parent container ${this.state.name} is a tubes without parent`)
        }
        return this.state.cells
    }
    selectCell(location: CellIdentifier) {
        return this.cells.find((c) => c.coordinates === location.coordinates)
    }
    getCell(location: CellIdentifier) {
        const cell = this.selectCell(location)
        if (!cell) {
            throw new Error(`ParentContainer.getCell: Cell ${location.coordinates} not found in container ${location.parentContainer}`)
        }
        return cell
    }
    selectExistingSample(sampleID: SampleIdentifier) {
        return this.state.existingSamples.find((s) => s.id === sampleID)
    }
    getOrCreateExistingSample(sample: SampleDetail) {
        const foundSample = this.selectExistingSample(sample.id)
        if (foundSample) {
            return foundSample
        } else {
            this.state.existingSamples.push(sample)
            if (this.state.name !== null) {
                if (!sample.coordinates) {
                    throw new Error(`Sample ${sample.name} must have coordinates if it has a parent container`)
                }
                this.state.existingSamples.push({
                    name: sample.name,
                    project: sample.project,
                    id: sample.id,
                    volume: sample.volume,
                    highlight: false,
                    parentContainer: this.state.name,
                    container: sample.container,
                    coordinates: sample.coordinates,
                })
            } else {
                if (!sample.container) {
                    throw new Error(`Sample ${sample.name} must have a container if it does not have a parent container`)
                }
                this.state.existingSamples.push({
                    name: sample.name,
                    project: sample.project,
                    id: sample.id,
                    volume: sample.volume,
                    highlight: false,
                    parentContainer: null,
                    container: sample.container,
                    coordinates: null,
                })
            }
            return sample
        }
    }
}

const placement = new Placement(initialState)
const container = placement.selectParentContainer({ parentContainer: null })

function initialParentContainerState(payload: LoadParentContainerPayload): RealParentContainerState {
    const cellsFinal: RealParentContainerState['cells'] = []
    const { parentContainerName, spec } = payload
    const [axisRow = [] as const, axisColumn = [] as const] = spec
    for (const row of axisRow) {
        for (const col of axisColumn) {
            const coordinates = row + col
            cellsFinal.push({
                coordinates,
                preview: false,
                placedSamples: [],
            })
        }
    }

    return {
        name: parentContainerName,
        spec,
        cells: cellsFinal,
        existingSamples: []
    }
}