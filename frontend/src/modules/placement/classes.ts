import { CoordinateAxis } from "../../models/fms_api_models"
import { compareArray, coordinatesToOffsets, offsetsToCoordinates } from "../../utils/functions"
import { CellIdentifier, RealParentContainerIdentifier, Coordinates, PlacementDirections, PlacementState, PlacementType, RealParentContainerState, SampleID, SampleIdentifier, TubesWithoutParentContainerState, CellState, SampleState, TubesWithoutParentContainerIdentifier } from "./models"
import { LoadContainerPayload } from "./reducers"

export class PlacementContext {
    placementState: PlacementState
    placementClass: PlacementClass

    // these fields are not set by default
    _sourceContainer: RealParentContainerClass | TubesWithoutParentClass

    constructor(state: PlacementState) {
        this.placementState = state
    }

    setSourceContainer(containerID: RealParentContainerIdentifier | TubesWithoutParentContainerIdentifier) {
        this._sourceContainer = containerID.name ? new RealParentContainerClass(this, containerID) : new TubesWithoutParentClass(this)
    }

    get sourceContainer() {
        if (!this._sourceContainer) {
            throw new Error(`Source container is not set`)
        }
        return this._sourceContainer
    }
}

export class PlacementObject {
    context: PlacementContext

    constructor(context: PlacementContext) {
        this.context = context
    }

    get placementState() {
        return this.context.placementState
    }
}

export class PlacementClass extends PlacementObject {
    constructor(state: PlacementState, sourceContainer?: RealParentContainerIdentifier | TubesWithoutParentContainerIdentifier) {
        super(new PlacementContext(state))
        this.context.placementClass = this
        if (sourceContainer) {
            this.context.setSourceContainer(sourceContainer)
        }
    }

    loadContainerPayload(payload: LoadContainerPayload) {
        if (payload.parentContainerName == null) {
            let tubesWithoutParent = this.placementState.tubesWithoutParentContainer
            if (!tubesWithoutParent) {
                tubesWithoutParent = this.placementState.tubesWithoutParentContainer = {
                    samples: {}
                }
            }
            const payloadSampleIDs = new Set<SampleID>(payload.cells.map(c => c.sample))
            for (const oldExistingSampleID of Object.keys(tubesWithoutParent.samples).map(parseInt)) {
                if (!payloadSampleIDs.has(oldExistingSampleID)) {
                    for (const cellID of this.placementState.samples[oldExistingSampleID].placedAt) {
                        new CellClass(this.context, cellID).unplaceSample({ id: oldExistingSampleID })
                    }
                    delete tubesWithoutParent.samples[oldExistingSampleID]
                    delete this.placementState.samples[oldExistingSampleID]
                }
            }
            for (const cell of payload.cells) {
                const sampleID = cell.sample
                const sample = this.placementState.samples[sampleID] ?? {
                    containerName: 'TODO: get the name of the tube',
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
                const payloadCells: RealParentContainerState['cells'] = {}
                for (const rowCoord of axisRow) {
                    for (const colCoord of axisCol) {
                        const coordinates = `${rowCoord}${colCoord}`
                        payloadCells[coordinates] = {
                            fromContainer: { name: payload.parentContainerName },
                            coordinates,
                            samples: {},
                            preview: false
                        }
                    }
                }
                container = this.placementState.realParentContainers[payload.parentContainerName] = {
                    name: payload.parentContainerName,
                    cells: payloadCells,
                    spec: payload.spec
                }
            }
            const payloadSampleIDs = new Set<SampleID>(payload.cells.map(c => c.sample))
            const oldExistingSamples = Object.values(this.placementState.samples).filter(s => s.containerName === payload.parentContainerName)
            for (const sample of oldExistingSamples) {
                if (!payloadSampleIDs.has(sample.id)) {
                    for (const cellPlacedAt of this.placementState.samples[sample.id].placedAt) {
                        new CellClass(this.context, cellPlacedAt).unplaceSample(sample)
                    }
                    if (sample.fromCell) {
                        delete container.cells[sample.fromCell.coordinates].samples[sample.id]
                    }
                    delete this.placementState.samples[sample.id]
                }
            }
            for (const cell of payload.cells) {
                const sampleID = cell.sample
                const sample = this.placementState.samples[sampleID] ?? {
                    containerName: payload.parentContainerName, // TODO: use the name of the tube if it's in a tube
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

    getRealParentContainer(containerID: RealParentContainerIdentifier) {
        return new RealParentContainerClass(this.context, containerID)
    }

    getTubesWithoutParent() {
        return new TubesWithoutParentClass(this.context)
    }

    flushContainer(containerID: RealParentContainerIdentifier) {
        const container = this.placementState.realParentContainers[containerID.name]
        if (!container) {
            throw new Error(`Container ${containerID.name} not found in state`)
        }
        for (const sample of Object.values(this.placementState.samples)) {
            if (sample.fromCell?.fromContainer.name === containerID.name) {
                for (const cellID of sample.placedAt) {
                    new CellClass(this.context, cellID).unplaceSample(sample)
                }
            }
            delete this.placementState.samples[sample.id]
        }
        delete this.placementState.realParentContainers[containerID.name]
    }

    flushTubesWithoutParent() {
        const tubesWithoutParent = this.placementState.tubesWithoutParentContainer
        if (!tubesWithoutParent) {
            throw new Error(`Tubes without parent container not found in state`)
        }
        for (const sample of Object.values(this.placementState.samples)) {
            if (!sample.fromCell) {
                for (const cellID of sample.placedAt) { {
                        new CellClass(this.context, cellID).unplaceSample(sample)
                    }
                }
                delete this.placementState.samples[sample.id]
            }
            this.placementState.tubesWithoutParentContainer.samples = {}
        }
    }

    getCell(cellID: CellIdentifier) {
        return new CellClass(this.context, cellID)
    }
}

export class RealParentContainerClass extends PlacementObject {
    readonly state: RealParentContainerState

    constructor(context: PlacementContext, containerID: RealParentContainerIdentifier) {
        super(context)
        const state = context.placementState.realParentContainers[containerID.name]
        if (!state) {
            throw new Error(`Container ${containerID.name} not found in state`)
        }
        this.state = state
    }

    getCell(cellID: Pick<CellIdentifier, 'coordinates'>): CellClass {
        return new CellClass(this.context, { fromContainer: this, coordinates: cellID.coordinates })
    }
    getCellsInRow(row: number): CellClass[] {
        const [axisRow = [''], axisCol = ['']] = this.spec
        if (row >= axisRow.length) {
            throw new Error(`Row ${row} is out of bounds for container ${this}`)
        }

        const cells: CellClass[] = []
        for (const col of axisCol) {
            const coordinates = `${axisRow[row]}${col}`
            cells.push(this.getCell({ coordinates }))
        }

        return cells
    }
    getCellsInCol(col: number): CellClass[] {
        const [axisRow = [''], axisCol = ['']] = this.spec
        if (col >= axisCol.length) {
            throw new Error(`Column ${col} is out of bounds for container ${this}`)
        }

        const cells: CellClass[] = []
        for (const row of axisRow) {
            const coordinates = `${row}${axisCol[col]}`
            cells.push(this.getCell({ coordinates }))
        }

        return cells
    }

    placeSample(placement: SamplePlacementIdentifier) {
        this.getCell(placement.cell).placeSample(placement.sample)
    }
    placeAllSamples(sourceContainer: RealParentContainerIdentifier | TubesWithoutParentContainerIdentifier) {
        const samples: SampleClass[] = []
        if (sourceContainer.name) {
            // source containers should have no new placements
            samples.push(...new RealParentContainerClass(this.context, sourceContainer).getSortedPlacements(true).map((s) => s.sample))
        } else {
            samples.push(...new TubesWithoutParentClass(this.context).getSortedSamples(true))
        }

        const [axisRow = [''], axisCol = ['']] = this.spec
        const placementLocations = this.placementDestinations(samples, `${axisRow[0]}${axisCol[0]}`, PlacementType.PATTERN)
        if (placementLocations.length !== samples.length) {
            throw new Error(`Placement locations length does not match samples length`)
        }
        for (let i = 0; i < placementLocations.length; i++) {
            const sample = samples[i]
            const destinationCell = placementLocations[i]
            sample.placeAtCell(destinationCell)
        }
    }
    unplaceSample(placedSample: SamplePlacementIdentifier) {
        this.getCell(placedSample.cell).unplaceSample(placedSample.sample)
    }

    isPlacementSelected(placedSample: SamplePlacementIdentifier) {
        return this.getCell(placedSample.cell).isSampleSelected(placedSample.sample)
    }
    selectPlacement(placedSample: SamplePlacementIdentifier) {
        this.getCell(placedSample.cell).setSelection(placedSample.sample, true)
    }
    unSelectPlacement(placedSample: SamplePlacementIdentifier) {
        this.getCell(placedSample.cell).setSelection(placedSample.sample, false)
    }
    togglePlacementSelections(...entries: SamplePlacementIdentifier[]) {
        const allSelected = entries.every(s => this.isPlacementSelected(s))
        if (allSelected) {
            for (const entry of entries) {
                this.unSelectPlacement(entry)
            }
        } else {
            for (const entry of entries) {
                this.selectPlacement(entry)
            }
        }
    }

    clearPreviews() {
        for (const cellKey in this.state.cells) {
            this.state.cells[cellKey].preview = false
        }
    }
    setPreviews(...cellIDs: CellIdentifier[]) {
        this.clearPreviews()
        for (const cellID of cellIDs) {
            const cell = this.getCell(cellID)
            cell.state.preview = true
        }
    }

    compareSamples(a: SamplePlacementIdentifier, b: SamplePlacementIdentifier) {
        const MAX = 128

        const A = this.#resolveSamplePlacementIdentifier(a)
        const B = this.#resolveSamplePlacementIdentifier(b)

        let orderA = MAX
        let orderB = MAX

        if (this.isPlacementSelected(A)) orderA -= MAX / 2
        if (this.isPlacementSelected(B)) orderB -= MAX / 2

        const aOffsets = coordinatesToOffsets(A.cell.fromContainer.spec, A.cell.coordinates)
        const bOffsets = coordinatesToOffsets(B.cell.fromContainer.spec, B.cell.coordinates)
        const arrayComparison = compareArray(aOffsets.reverse(), bOffsets.reverse())
        if (arrayComparison < 0) orderA -= MAX / 4
        if (arrayComparison > 0) orderB -= MAX / 4

        if (A.sample.name < B.sample.name) orderA -= MAX / 8
        if (A.sample.name > B.sample.name) orderB -= MAX / 8

        if (A.sample.containerName < B.sample.containerName) orderA -= MAX / 16
        if (A.sample.containerName > B.sample.containerName) orderB -= MAX / 16

        if (A.sample.projectName < B.sample.projectName) orderA -= MAX / 32
        if (A.sample.projectName > B.sample.projectName) orderB -= MAX / 32

        return orderA - orderB
    }

    placementDestinations(samples: SampleIdentifier[], coordinates: Coordinates, placementType: PlacementType, placementDirection: PlacementDirections = PlacementDirections.COLUMN) {
        const [axisRow = [''], axisCol = ['']] = this.spec
        const height = axisRow.length
        const width = axisCol.length

        const newOffsetsList: number[][] = []
        const destinationStartingOffsets = coordinatesToOffsets(this.spec, coordinates)

        switch (placementType) {
            case PlacementType.PATTERN: {
                const sourceContainer = this.context.sourceContainer
                if (sourceContainer instanceof TubesWithoutParentClass) {
                    throw new Error(`Pattern placement is not supported for tubes without parent`)
                }

                const sourceOffsetsList = samples.map((selection) => {
                    const cell = new SampleClass(this.context, selection).fromCell
                    if (cell == null) {
                        throw new Error(`Sample ${selection.id} is not placed in a cell`)
                    }
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

                const relativeOffsetByIndices = Object.keys(samples).sort((indexA, indexB) => {
                    const a = samples[indexA]
                    const b = samples[indexB]
                    return sourceContainer.compareSamples(a, b)
                }).reduce<Record<number, number>>((relativeOffsetByIndices, sortedIndex, index) => {
                    relativeOffsetByIndices[sortedIndex] = index
                    return relativeOffsetByIndices
                }, {})

                for (const sourceIndex in samples) {
                    const relativeOffset = relativeOffsetByIndices[sourceIndex]
                    const [startingRow, startingCol] = destinationStartingOffsets

                    const { ROW, COLUMN } = PlacementDirections
                    const finalOffsets = {
                        [ROW]: startingRow,
                        [COLUMN]: startingCol
                    }

                    if (placementDirection === PlacementDirections.ROW) {
                        finalOffsets[COLUMN] += relativeOffset
                        const finalColBeforeWrap = finalOffsets[1]
                        if (finalColBeforeWrap >= width) {
                            finalOffsets[COLUMN] = finalColBeforeWrap % width
                            finalOffsets[ROW] += Math.floor(finalColBeforeWrap / width)
                        }
                    } else if (placementDirection === PlacementDirections.COLUMN) {
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
                results.push(this.getCell({ coordinates: offsetsToCoordinates(offsets, this.spec) }))
            } catch (e) {
                this.context.placementState.error ??= e.message
            }
        }
        return results
    }


    toString() {
        return `RealContainerParentClass(name=${this.name})`
    }

    #resolveSamplePlacementIdentifier(placedSample: SamplePlacementIdentifier): SamplePlacement {
        const cell = this.getCell(placedSample.cell)
        const sample = new SampleClass(this.context, placedSample.sample)
        return { sample, cell }
    }

    getPlacements(onlySelected = false): SamplePlacement[] {
        return Object.values(this.state.cells)
            .flatMap((cell) =>
                Object.keys(cell.samples).map((id) => ({
                    sample: new SampleClass(this.context, { id: Number(id) }),
                    cell: new CellClass(this.context, cell)
                }))
            )
            .filter((id) => onlySelected ? this.isPlacementSelected(id) : true)
    }

    getSortedPlacements(onlySelected = false): SamplePlacement[] {
        return this.getPlacements(onlySelected).sort((a, b) => this.compareSamples(a, b))
    }

    get name() {
        return this.state.name
    }
    get spec() {
        return this.state.spec
    }
}

export class TubesWithoutParentClass extends PlacementObject {
    readonly state: TubesWithoutParentContainerState

    constructor(context: PlacementContext) {
        super(context)
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

        if (a.containerName < b.containerName) orderA -= MAX / 16
        if (a.containerName > b.containerName) orderB -= MAX / 16

        if (a.projectName < b.projectName) orderA -= MAX / 32
        if (a.projectName > b.projectName) orderB -= MAX / 32

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

    getSamples() {
        return Object.keys(this.state.samples)
            .map(id => new SampleClass(this.context, { id: Number(id) }))
    }

    getSortedSamples(onlySelected = false) {
        return this.getSamples()
            .filter((s) => onlySelected ? this.state.samples[s.id]?.selected : true)
            .sort((a, b) => this.compareSamples(a, b))
    }
}

export class CellClass extends PlacementObject {
    readonly state: CellState

    constructor(context: PlacementContext, cellID: CellIdentifier) {
        super(context)
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
            const existingSample = this.findExistingSample()
            if (existingSample) {
                this.toggleSelection(existingSample)
            }
            return
        }

        const selections: SampleClass[] = []
        if (this.context.sourceContainer instanceof TubesWithoutParentClass) {
            selections.push(...this.context.sourceContainer.getSortedSamples(true))
        } else {
            // source containers should have no new placements
            selections.push(...this.context.sourceContainer.getSortedPlacements(true).map((s => s.sample)))
        }

        if (selections.length > 0) {
            // placement branch
            const destinationCells = this.fromContainer.placementDestinations(
                selections,
                this.coordinates,
                this.context.placementState.placementType,
                this.context.placementState.placementDirection
            )
            if (destinationCells.length !== selections.length) {
                throw new Error(`Destination cells length does not match selections length`)
            }
            for (let i = 0; i < destinationCells.length; i++) {
                selections[i].placeAtCell(destinationCells[i])
            }
        } else {
            // toggle selection in destination container branch
            const existingSample = this.findExistingSample()
            this.fromContainer.togglePlacementSelections(
                ...this.getSamples().filter((sample) => sample.id !== existingSample?.id).map((sample) => ({ sample, cell: this }))
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
        const samples: SampleClass[] = []
        if (this.context.sourceContainer instanceof TubesWithoutParentClass) {
            samples.push(...this.context.sourceContainer.getSortedSamples(true))
        } else {
            // source containers should have no new placements
            samples.push(...this.context.sourceContainer.getSortedPlacements(true).map((s => s.sample)))
        }
        const destinations = this.fromContainer.placementDestinations(
            samples,
            this.coordinates,
            this.context.placementState.placementType,
            this.context.placementState.placementDirection
        )
        this.fromContainer.setPreviews(...destinations)
    }
    exit() {
        this.fromContainer.clearPreviews()
    }

    toString() {
        return `Cell(container=${this.fromContainer}, coordinates=${this.coordinates})`
    }

    isSampleSelected(sampleID: SampleIdentifier) {
        return this.getSampleEntry(sampleID).selected
    }
    setSelection(sampleID: SampleIdentifier, selected: boolean) {
        this.getSampleEntry(sampleID).selected = selected
    }
    toggleSelection(sampleID: SampleIdentifier) {
        const entry = this.getSampleEntry(sampleID)
        entry.selected = !entry.selected
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
        const sample = new SampleClass(this.context, sampleID)

        if (this.state.samples[sampleID.id]) {
            if (sample.fromCell?.sameParentContainer(this)) {
                throw new Error(`Sample ${sample} is already placed in this cell ${this}`)
            }
            delete this.state.samples[sampleID.id]
        }

        if (twoWayPlacement) {
            sample.unplaceAtCell(this, false)
        }
    }

    getSamples() {
        return Object.keys(this.state.samples)
            .map(id => new SampleClass(this.context, { id: Number(id) }))
    }
    getSampleEntry(sampleID: SampleIdentifier) {
        const entry = this.state.samples[sampleID.id]
        if (!entry) {
            throw new Error(`Sample ${sampleID.id} not found in cell ${this}`)
        }
        return entry
    }
    getPlacements(): SamplePlacement[] {
        return Object.keys(this.state.samples)
            .map(id => ({
                sample: new SampleClass(this.context, { id: Number(id) }),
                cell: this
            }))
    }

    findExistingSample() {
        return this.getSamples().find(sample => sample.fromCell?.sameParentContainer(this))
    }

    sameParentContainer(cellID: CellIdentifier) {
        return this.fromContainer.name === cellID.fromContainer.name
    }

    get fromContainer() {
        return new RealParentContainerClass(this.context, this.state.fromContainer)
    }

    get coordinates() {
        return this.state.coordinates
    }
}

export class SampleClass extends PlacementObject {
    readonly state: SampleState

    constructor(context: PlacementContext, sampleID: SampleIdentifier) {
        super(context)
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
        if (this.fromCell?.sameParentContainer(cellID)) {
            throw new Error(`Sample ${this} is already placed in this cell ${new CellClass(this.context, cellID)}`)
        }
        const index = this.state.placedAt.findIndex(cell => cell.coordinates === cellID.coordinates)
        if (index !== -1) {
            this.state.placedAt.splice(index, 1)
        }
        if (twoWayPlacement) {
            new CellClass(this.context, cellID).unplaceSample(this, false)
        }
    }

    toString() {
        return `Sample(id=${this.id}, name=${this.name}, container=${this.fromCell?.fromContainer ?? new TubesWithoutParentClass(this.context)}, cell=${this.fromCell})`
    }

    get id() {
        return this.state.id
    }
    get name() {
        return this.state.name
    }
    get containerName() {
        return this.state.containerName
    }
    get projectName() {
        return this.state.projectName
    }
    get fromCell() {
        return this.state.fromCell ? new CellClass(this.context, this.state.fromCell) : null
    }
}

export interface SamplePlacement { sample: SampleClass, cell: CellClass }
export interface SamplePlacementIdentifier { sample: SampleIdentifier, cell: Pick<CellIdentifier, 'coordinates'> }