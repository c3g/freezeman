import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"
import { comparePlacementSamples, coordinatesToOffsets, offsetsToCoordinates, PlacementSample } from "../../utils/functions"
import { CellIdentifier, RealParentContainerIdentifier, Coordinates, PlacementDirections, PlacementState, PlacementType, RealParentContainerState, SampleID, SampleIdentifier, TubesWithoutParentContainerState, CellState, SampleState, TubesWithoutParentContainerIdentifier, SampleEntry, ParentContainerIdentifier } from "./models"
import { LoadContainerPayload } from "./reducers"

export class PlacementContext {
    placementState: PlacementState

    // these fields are not set by default, they should be set ASAP
    _sourceContainer: RealParentContainerClass | TubesWithoutParentClass
    placementClass: PlacementClass

    constructor(state: PlacementState) {
        this.placementState = state
    }

    setSourceContainer(containerID: ParentContainerIdentifier) {
        this._sourceContainer = containerID.name !== null
            ? this.placementClass.getRealParentContainer(containerID)
            : this.placementClass.getTubesWithoutParent()
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

    get placement() {
        return this.context.placementClass
    }
}

export class PlacementClass extends PlacementObject {
    constructor(state: PlacementState, sourceContainer: ParentContainerIdentifier | undefined) {
        super(new PlacementContext(state))
        this.context.placementClass = this
        if (sourceContainer) {
            this.context.setSourceContainer(sourceContainer)
        }
    }

    loadContainerPayload(payload: LoadContainerPayload) {
        if (payload.parentContainerName === null) {
            // find existing tubes without parent container
            let tubesWithoutParent = this.placementState.tubesWithoutParentContainer
            if (!tubesWithoutParent) {
                // create new tubes without parent container
                tubesWithoutParent = this.placementState.tubesWithoutParentContainer = {
                    name: null,
                    samples: {}
                }
            }
            const payloadSampleIDs = new Set<SampleID>(payload.cells.map(c => c.sample))
            const oldExistingSamples = Object.values(this.placementState.samples).reduce<SampleState[]>((acc, sample) => {
                if (!sample) return acc
                if (!sample.fromCell) {
                    acc.push(sample)
                }
                return acc
            }, [])
            // prune out samples that are not in the payload
            for (const sample of oldExistingSamples) {
                if (!payloadSampleIDs.has(sample.id)) {
                    for (const cellID of Object.values(sample.placedAt)) {
                        this.placement.getCell(cellID).unplaceSample(sample)
                    }
                    delete tubesWithoutParent.samples[sample.id]
                    delete this.placementState.samples[sample.id]
                }
            }
            // add new or update existing samples
            for (const cell of payload.cells) {
                const sampleID = cell.sample
                const sample: SampleState = this.placementState.samples[sampleID] ?? {
                    containerName: cell.containerName,
                    id: sampleID,
                    name: cell.name,
                    projectName: cell.projectName,
                    fromCell: null,
                    placedAt: []
                }
                this.placementState.samples[sampleID] = sample
                const cellSample: SampleEntry = tubesWithoutParent.samples[sampleID] ?? {
                    selected: false,
                }
                tubesWithoutParent.samples[sampleID] = cellSample
            }
        } else {
            // find existing real parent container
            let container = this.placementState.realParentContainers[payload.parentContainerName]
            // create new real parent container if it doesn't exist
            if (!container) {
                const [axisRow = [''], axisCol = ['']] = payload.spec
                const payloadCells: RealParentContainerState['cells'] = {}
                for (const rowCoord of axisRow) {
                    for (const colCoord of axisCol) {
                        const coordinates = `${rowCoord}${colCoord}`
                        payloadCells[coordinates] = {
                            fromContainer: { name: payload.parentContainerName },
                            coordinates,
                            samples: {},
                            preview: null
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
            const oldExistingSamples = Object.values(this.placementState.samples).reduce<SampleState[]>((acc, sample) => {
                if (!sample) return acc
                if (sample.fromCell?.fromContainer.name === payload.parentContainerName) {
                    acc.push(sample)
                }
                return acc
            }, [])
            // prune out samples that are not in the payload
            for (const sample of oldExistingSamples) {
                if (!payloadSampleIDs.has(sample.id)) {
                    for (const cellPlacedAt of Object.values(sample.placedAt)) {
                        // clear all placements of the sample
                        this.placement.getCell(cellPlacedAt).unplaceSample(sample)
                    }
                    if (sample.fromCell) {
                        // remove sample reference from its original cell
                        delete container.cells[sample.fromCell.coordinates].samples[sample.id]
                    }
                    delete this.placementState.samples[sample.id]
                }
            }
            // add new or update existing samples
            for (const payloadCell of payload.cells) {
                const sampleID = payloadCell.sample
                const sample = this.placementState.samples[sampleID] ?? {
                    containerName: payloadCell.containerName,
                    id: sampleID,
                    name: payloadCell.name,
                    projectName: payloadCell.projectName,
                    fromCell: {
                        fromContainer: { name: payload.parentContainerName },
                        coordinates: payloadCell.coordinates
                    },
                    placedAt: []
                }
                this.placementState.samples[sampleID] = sample
                const cellSample: SampleEntry = container.cells[payloadCell.coordinates].samples[sampleID] ?? {
                    selected: false,
                }
                container.cells[payloadCell.coordinates].samples[sampleID] = cellSample
            }
        }
    }

    flushRealParentContainer(flushedContainerID: RealParentContainerIdentifier) {
        const container = this.placementState.realParentContainers[flushedContainerID.name]
        if (!container) {
            throw new Error(`Container ${flushedContainerID.name} not found in state`)
        }
        for (const sampleID of Object.keys(this.placementState.samples)) {
            const sample = this.placement.getSample({ id: Number(sampleID) })
            if (sample.fromCell?.fromContainer?.sameContainerAs(flushedContainerID)) {
                for (const cellID of Object.values(sample.state.placedAt)) {
                    sample.unplaceAtCell(cellID)
                }
                delete this.placementState.samples[sample.id]
            }
        }
        delete this.placementState.realParentContainers[flushedContainerID.name]
    }

    flushTubesWithoutParent() {
        for (const sampleID of Object.keys(this.placementState.samples)) {
            const sample = this.placement.getSample({ id: Number(sampleID) })
            if (!sample.fromCell) {
                for (const cellID of Object.values(sample.state.placedAt)) {
                    sample.unplaceAtCell(cellID)
                }
                delete this.placementState.samples[sample.id]
            }
            this.placementState.tubesWithoutParentContainer.samples = {}
        }
    }

    getRealParentContainer(containerID: RealParentContainerIdentifier) {
        return new RealParentContainerClass(this.context, containerID)
    }

    getTubesWithoutParent() {
        return new TubesWithoutParentClass(this.context)
    }

    getParentContainer(containerID: ParentContainerIdentifier) {
        if (containerID.name === null) {
            return this.getTubesWithoutParent()
        } else {
            return this.getRealParentContainer(containerID)
        }
    }

    getCell(cellID: CellIdentifier) {
        return new CellClass(this.context, cellID)
    }

    getSample(sampleID: SampleIdentifier) {
        return new SampleClass(this.context, sampleID)
    }

    getPlacement(placementID: SamplePlacementIdentifier) {
        return new SamplePlacement(this.context, placementID)
    }
}

export class ParentContainerClass extends PlacementObject {
    constructor(context: PlacementContext) {
        super(context)
    }

    sameContainerAs(containerID: ParentContainerIdentifier) {
        return this.name === containerID.name
    }
    isSourceContainer() {
        return this.sameContainerAs(this.context.sourceContainer)
    }
    isDestinationContainer() {
        return !this.isSourceContainer()
    }

    get name(): ParentContainerIdentifier['name'] {
        throw new Error(`${this.constructor.name} does not implement name`)
    }
    get spec(): CoordinateSpec | undefined {
        throw new Error(`${this.constructor.name} does not implement spec`)
    }
}

export class RealParentContainerClass extends ParentContainerClass {
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
        return this.placement.getCell({ fromContainer: this, coordinates: cellID.coordinates })
    }
    getCellsInRow(row: number): CellClass[] {
        const [axisRow = [''], axisCol = ['']] = this.spec
        if (row >= axisRow.length) {
            throw new Error(`Row ${row} is out of bounds for container ${this}`)
        }

        const cells = axisCol.map((col) => this.getCell({ coordinates: `${axisRow[row]}${col}` }))
        return cells
    }
    getCellsInCol(col: number): CellClass[] {
        const [axisRow = [''], axisCol = ['']] = this.spec
        if (col >= axisCol.length) {
            throw new Error(`Column ${col} is out of bounds for container ${this}`)
        }

        const cells = axisRow.map((row) => this.getCell({ coordinates: `${row}${axisCol[col]}` }))
        return cells
    }

    placeAllSamples(sourceContainer: ParentContainerIdentifier) {
        const samples: SampleClass[] = []
        const sourceContainerObject = this.placement.getParentContainer(sourceContainer)
        if (sourceContainerObject instanceof RealParentContainerClass) {
            // source containers should have no new placements, only existing samples
            samples.push(...sourceContainerObject.getPlacements().map((s) => s.sample))
        } else {
            samples.push(...sourceContainerObject.getSamples())
        }

        const [axisRow = [''], axisCol = ['']] = this.spec
        const placementLocations = this.placementDestinations(
            samples,
            `${axisRow[0]}${axisCol[0]}`,
            PlacementType.PATTERN,
        )
        if (placementLocations.length !== samples.length) {
            throw new Error(`Placement locations length does not match samples length`)
        }
        for (let i = 0; i < placementLocations.length; i++) {
            const sample = samples[i]
            const destinationCell = placementLocations[i]
            sample.placeAtCell(destinationCell.rawIdentifier())
        }
    }
    undoPlacements() {
        // find selected placements of foreign samples
        let placements = this.getPlacements(true).filter((s) => !s.sample.fromCell?.fromContainer?.sameContainerAs(this))
        if (placements.length === 0) {
            // find any placements of foreign samples
            placements = this.getPlacements(false).filter((s) => !s.sample.fromCell?.fromContainer?.sameContainerAs(this))
        }
        for (const selection of placements) {
            selection.cell.unplaceSample(selection.sample)
        }
    }

    isPlacementSelected(placedSample: SamplePlacementIdentifier) {
        return this.getCell(placedSample.cell).isSampleSelected(placedSample.sample)
    }
    setSelectionOfPlacement(placedSample: SamplePlacementIdentifier, selection: boolean) {
        this.getCell(placedSample.cell).setSelectionOfSample(placedSample.sample, selection)
    }
    togglePlacementSelections(...entries: SamplePlacementIdentifier[]) {
        const allSelected = entries.every(s => this.isPlacementSelected(s))
        for (const entry of entries) {
            this.setSelectionOfPlacement(entry, !allSelected)
        }
    }

    clearPreviews() {
        for (const cellKey in this.state.cells) {
            this.state.cells[cellKey].preview = null
        }
    }
    setPreviews(sources: Pick<CellIdentifier, 'coordinates'>[], destinations: Pick<CellIdentifier, 'coordinates'>[]) {
        this.clearPreviews()
        for (let index = 0; index < sources.length && index < destinations.length; index++) {
            const source = sources[index]
            const destination = destinations[index]
            const cell = this.getCell(destination)
            cell.state.preview = source.coordinates ?? ''
            if (cell.getSamples(true).length > 0) {
                this.placementState.error ??= `Sample ${cell.getSamples(true)[0].name} already exists in cell ${cell.coordinates}`
            }
        }
    }

    placementDestinations(samples: SampleIdentifier[], coordinates: Coordinates, placementType: PlacementType, placementDirection: PlacementDirections | undefined = undefined) {
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
                    const cell = this.placement.getSample(selection).fromCell
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

                const relativeOffsetByIndices: Record<number, number> = {}

                //#region populate relativeOffsetByIndices
                const placementSamples: (PlacementSample & { index: number })[] = []
                for (let index = 0; index < samples.length; index++) {
                    const sample = this.placement.getSample(samples[index])
                    const placementSample: typeof placementSamples[number] = {
                        index,
                        id: sample.id,
                        selected: false, // temporary
                        name: sample.name,
                        projectName: sample.projectName,
                        containerName: sample.containerName,
                        coordinates: sample.fromCell?.coordinates,
                        fromCell: sample.fromCell?.rawIdentifier() ?? null,
                    }
                    if (sourceContainer instanceof TubesWithoutParentClass) {
                        placementSample.selected = sourceContainer.isSampleSelected(sample)
                    } else {
                        if (!sample.fromCell) {
                            throw new Error(`Sample ${sample.id} is not placed in a cell from ${sourceContainer}`)
                        }
                        placementSample.selected = sourceContainer.isPlacementSelected({ sample, cell: sample.fromCell })
                    }
                    placementSamples.push(placementSample)
                }
                placementSamples.sort((a, b) => comparePlacementSamples(a, b, sourceContainer.spec))
                for (let index = 0; index < placementSamples.length; index++) {
                    const item = placementSamples[index]
                    relativeOffsetByIndices[item.index] = index
                }
                //#endregion

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

    // TODO: use dictionary parameter
    getPlacements(onlySelected = false): SamplePlacement[] {
        return Object.values(this.state.cells)
            .flatMap((cell) =>
                Object.keys(cell.samples).map((id) => new SamplePlacement(this.context, {
                    sample: this.placement.getSample({ id: Number(id) }),
                    cell: this.placement.getCell(cell)
                }))
            )
            .filter((id) => onlySelected ? this.isPlacementSelected(id) : true)
    }

    get name() {
        return this.state.name
    }
    get spec() {
        return this.state.spec
    }

    rawIdentifier(): RealParentContainerIdentifier {
        return {
            name: this.state.name
        }
    }
}

export class TubesWithoutParentClass extends ParentContainerClass {
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
        return this.#getSampleEntry(sampleID).selected
    }
    setSelectionOfSample(sampleID: SampleIdentifier, selection: boolean) {
        if (sampleID.id in this.state.samples) {
            this.#getSampleEntry(sampleID).selected = selection
        }
    }
    toggleSelections(...sampleIDs: SampleIdentifier[]) {
        const allSelected = sampleIDs.every(s => this.isSampleSelected(s))
        for (const sampleID of sampleIDs) {
            this.setSelectionOfSample(sampleID, !allSelected)
        }
    }

    toString() {
        return `TubesWithoutParent()`
    }

    #getSampleEntry(sampleID: SampleIdentifier) {
        const sample = this.state.samples[sampleID.id]
        if (!sample) {
            throw new Error(`Sample ${sampleID.id} not found in state`)
        }
        return sample
    }

    getSamples(onlySelected = false) {
        return Object.keys(this.state.samples)
            .map(id => this.placement.getSample({ id: Number(id) }))
            .filter((s) => onlySelected ? this.state.samples[s.id]?.selected : true)
    }

    get name() {
        return null
    }

    get spec() {
        return undefined
    }

    rawIdentifier(): TubesWithoutParentContainerIdentifier {
        return {
            name: null
        }
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
        if (this.fromContainer.isSourceContainer()) {
            // toggle selection in source container branch
            const existingSample = this.findExistingSample()
            if (existingSample) {
                this.toggleSelection(existingSample)
            }
            return
        }

        const selections: SampleClass[] = []
        if (this.context.sourceContainer instanceof TubesWithoutParentClass) {
            selections.push(...this.context.sourceContainer.getSamples(true))
        } else {
            // source containers should have no new placements
            // so no need to filter out new placements
            selections.push(...this.context.sourceContainer.getPlacements(true).map((s => s.sample)))
        }

        if (selections.length > 0) {
            // placement branch
            const destinationCells = this.fromContainer.placementDestinations(
                selections,
                this.coordinates,
                this.context.placementState.placementType,
                this.context.placementState.placementDirection,
            )
            if (destinationCells.length !== selections.length) {
                throw new Error(`Destination cells length does not match selections length`)
            }
            for (let i = 0; i < destinationCells.length; i++) {
                selections[i].placeAtCell(destinationCells[i].rawIdentifier())
                const cell = selections[i].fromCell
                if (cell !== null) {
                    cell.setSelectionOfSample(selections[i].rawIdentifier(), false)
                } else {
                    this.context.placementClass.getTubesWithoutParent().setSelectionOfSample(selections[i].rawIdentifier(), false)
                }
            }
            this.fromContainer.clearPreviews()
        } else {
            // toggle selection in destination container branch
            this.fromContainer.togglePlacementSelections(
                ...this.getSamplePlacements(false)
            )
        }
    }

    enter() {
        if (this.fromContainer.isSourceContainer()) {
            return
        }
        const samples: SampleClass[] = []
        if (this.context.sourceContainer instanceof TubesWithoutParentClass) {
            samples.push(...this.context.sourceContainer.getSamples(true))
        } else {
            // source containers should have no new placements
            samples.push(...this.context.sourceContainer.getPlacements(true).map((s => s.sample)))
        }
        const destinations = this.fromContainer.placementDestinations(
            samples,
            this.coordinates,
            this.context.placementState.placementType,
            this.context.placementState.placementDirection,
        )
        this.fromContainer.setPreviews(
            samples.map((s) => s.fromCell?.rawIdentifier() ?? { coordinates: '' }),
            destinations
        )
    }
    exit() {
        this.fromContainer.clearPreviews()
    }

    toString() {
        return `Cell(container=${this.fromContainer}, coordinates=${this.coordinates})`
    }

    isSampleSelected(sampleID: SampleIdentifier) {
        return this.getSampleEntryState(sampleID).selected
    }
    setSelectionOfSample(sampleID: SampleIdentifier, selected: boolean) {
        const sample = this.placement.getSample(sampleID)
        if (this.fromContainer.isDestinationContainer() && sample.fromCell?.sameCellAs(this)) {
            // don't do selection if the sample is already existing in the particular cell of the container (as a destination)
            this.getSampleEntryState(sampleID).selected = false
        } else {
            this.getSampleEntryState(sampleID).selected = selected
        }
    }
    toggleSelection(sampleID: SampleIdentifier) {
        this.setSelectionOfSample(sampleID, !this.isSampleSelected(sampleID))
    }

    placeSample(sampleID: SampleIdentifier, twoWayPlacement = true) {
        if (Object.keys(this.state.samples).length > 0) {
            throw new Error(`Cell ${this} already has samples`)
        }
        if (!this.state.samples[sampleID.id]) {
            this.state.samples[sampleID.id] = { selected: false }
        }

        if (twoWayPlacement) {
            this.placement.getSample(sampleID).placeAtCell(this.rawIdentifier(), false)
        }
    }
    unplaceSample(sampleID: SampleIdentifier, twoWayPlacement = true) {
        const sample = this.placement.getSample(sampleID)

        if (this.state.samples[sampleID.id]) {
            if (sample.fromCell?.sameCellAs(this)) {
                throw new Error(`Sample ${sample} is an existing sample in this cell ${this}`)
            }
            delete this.state.samples[sampleID.id]
        }

        if (twoWayPlacement) {
            sample.unplaceAtCell(this.rawIdentifier(), false)
        }
    }

    getSamples(includeExistinSamples = true): SampleClass[] {
        return Object.keys(this.state.samples)
            .map(id => this.placement.getSample({ id: Number(id) }))
            .filter((sample) => includeExistinSamples
                ? true
                : !sample.fromCell?.sameCellAs(this)
            )
    }
    getSamplePlacements(includeExistingSamples = true): SamplePlacement[] {
        return this.getSamples(includeExistingSamples)
            .map((sample) => new SamplePlacement(this.context, { sample, cell: this }))
    }
    getSampleEntryState(sampleID: SampleIdentifier) {
        const entry = this.state.samples[sampleID.id]
        if (!entry) {
            throw new Error(`Sample ${sampleID.id} not found in cell ${this}`)
        }
        return entry
    }

    findExistingSample() {
        return this.getSamples().find((sample) => sample.fromCell && sample.fromCell.sameCellAs(this))
    }

    sameParentContainerAs(cellID: Pick<CellIdentifier, 'fromContainer'>) {
        return this.fromContainer.name === cellID.fromContainer.name
    }

    get fromContainer() {
        return this.placement.getRealParentContainer(this.state.fromContainer)
    }

    get coordinates() {
        return this.state.coordinates
    }

    get preview() {
        return this.state.preview
    }

    sameCellAs(cellID: CellIdentifier) {
        return this.state.fromContainer.name === cellID.fromContainer.name &&
            this.state.coordinates === cellID.coordinates
    }

    rawIdentifier(): CellIdentifier {
        return {
            fromContainer: { name: this.fromContainer.name },
            coordinates: this.coordinates
        }
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
        // do backward placement first because it's easier to test
        // for sample already existing or placed in cell from the
        // cell's point of view
        if (twoWayPlacement) {
            this.placement.getCell(cellID).placeSample(this.rawIdentifier(), false)
        }
        if (!this.state.placedAt.find(placedAt => placedAt.fromContainer.name === cellID.fromContainer.name && placedAt.coordinates === cellID.coordinates)) {
            this.state.placedAt.push(cellID)
        }
    }
    unplaceAtCell(cellID: CellIdentifier, twoWayPlacement = true) {
        if (this.fromCell?.sameCellAs(cellID)) {
            throw new Error(`Sample ${this} is an existing sample in this cell ${this.placement.getCell(cellID)}`)
        }
        const index = this.state.placedAt.findIndex(cell =>
            cell.fromContainer.name === cellID.fromContainer.name &&
            cell.coordinates === cellID.coordinates
        )
        if (index !== -1) {
            this.state.placedAt.splice(index, 1)
        }
        if (twoWayPlacement) {
            this.placement.getCell(cellID).unplaceSample(this.rawIdentifier(), false)
        }
    }

    toString() {
        return `Sample(id=${this.id}, name=${this.name}, container=${this.fromCell?.fromContainer ?? this.placement.getTubesWithoutParent()}, cell=${this.fromCell})`
    }

    sameSampleAs(sampleID: SampleIdentifier) {
        return this.state.id === sampleID.id
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
        return this.state.fromCell ? this.placement.getCell(this.state.fromCell) : null
    }

    rawIdentifier(): SampleIdentifier {
        return {
            id: this.state.id
        }
    }
}

export class SamplePlacement extends PlacementObject {
    sample: SampleClass
    cell: CellClass

    constructor(context: PlacementContext, { sample, cell }: SamplePlacementIdentifier) {
        super(context)
        this.sample = this.placement.getSample(sample)
        this.cell = this.placement.getCell(cell)
    }

    get selected() {
        return this.cell.isSampleSelected(this.sample)
    }

    rawIdentifier(): SamplePlacementIdentifier {
        return {
            sample: this.sample.rawIdentifier(),
            cell: this.cell.rawIdentifier()
        }
    }

    toString() {
        return `SamplePlacement(sample=${this.sample}, cell=${this.cell})`
    }
}
export interface SamplePlacementIdentifier { sample: SampleIdentifier, cell: CellIdentifier }