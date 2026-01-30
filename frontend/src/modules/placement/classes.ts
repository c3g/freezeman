import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"
import { comparePlacementSamples, coordinatesToOffsets, offsetsToCoordinates, PlacementSample } from "../../utils/functions"
import { CellIdentifier, RealParentContainerIdentifier, Coordinates, PlacementDirections, PlacementState, PlacementType, RealParentContainerState, SampleID, SampleIdentifier, TubesWithoutParentContainerState, CellState, SampleState, TubesWithoutParentContainerIdentifier, SampleEntry, ParentContainerIdentifier, PlacementOptions } from "./models"
import { LoadContainerPayload } from "./reducers"

export class PlacementContext {
    placementState: PlacementState

    // these fields are not set by default, they should be set ASAP
    _sourceContainer!: RealParentContainerClass | TubesWithoutParentClass
    placementClass!: PlacementClass

    constructor(state: PlacementState) {
        this.placementState = state
    }

    setSourceContainer(containerID: ParentContainerIdentifier) {
        this._sourceContainer = containerID.name !== null
            ? this.placementClass.getRealParentContainer(containerID)
            : this.placementClass.getTubesWithoutParent()
    }

    getSourceContainer() {
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

    getPlacementState() {
        return this.context.placementState
    }

    getPlacementClass() {
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
            let tubesWithoutParent = this.getPlacementState().tubesWithoutParentContainer
            if (!tubesWithoutParent) {
                // create new tubes without parent container
                tubesWithoutParent = this.getPlacementState().tubesWithoutParentContainer = {
                    name: null,
                    samples: {}
                }
            }
            const payloadSampleIDs = new Set<SampleID>(payload.cells.map(c => c.sample))
            const oldExistingSamples = Object.values(this.getPlacementState().samples).reduce<SampleState[]>((acc, sample) => {
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
                        this.getPlacementClass().getCell(cellID).unplaceSample(sample)
                    }
                    delete tubesWithoutParent.samples[sample.id]
                    delete this.getPlacementState().samples[sample.id]
                }
            }
            // add new or update existing samples
            for (const cell of payload.cells) {
                const sampleID = cell.sample
                const sample: SampleState = this.getPlacementState().samples[sampleID] ?? {
                    containerName: cell.containerName,
                    id: sampleID,
                    name: cell.name,
                    fromCell: null,
                    placedAt: []
                }
                this.getPlacementState().samples[sampleID] = sample
                const cellSample: SampleEntry = tubesWithoutParent.samples[sampleID] ?? {
                    selected: false,
                }
                tubesWithoutParent.samples[sampleID] = cellSample
            }
        } else {
            // find existing real parent container
            let container = this.getPlacementState().realParentContainers[payload.parentContainerName]
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
                container = this.getPlacementState().realParentContainers[payload.parentContainerName] = {
                    name: payload.parentContainerName,
                    cells: payloadCells,
                    spec: payload.spec
                }
            }
            const payloadSampleIDs = new Set<SampleID>(payload.cells.map(c => c.sample))
            const oldExistingSamples = Object.values(this.getPlacementState().samples).reduce<SampleState[]>((acc, sample) => {
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
                        this.getPlacementClass().getCell(cellPlacedAt).unplaceSample(sample)
                    }
                    if (sample.fromCell) {
                        // remove sample reference from its original cell
                        delete container.cells[sample.fromCell.coordinates].samples[sample.id]
                    }
                    delete this.getPlacementState().samples[sample.id]
                }
            }
            // add new or update existing samples
            for (const payloadCell of payload.cells) {
                const sampleID = payloadCell.sample
                const sample = this.getPlacementState().samples[sampleID] ?? {
                    containerName: payloadCell.containerName,
                    id: sampleID,
                    name: payloadCell.name,
                    fromCell: {
                        fromContainer: { name: payload.parentContainerName },
                        coordinates: payloadCell.coordinates
                    },
                    placedAt: []
                }
                this.getPlacementState().samples[sampleID] = sample
                const cellSample: SampleEntry = container.cells[payloadCell.coordinates].samples[sampleID] ?? {
                    selected: false,
                }
                container.cells[payloadCell.coordinates].samples[sampleID] = cellSample
            }
        }
    }

    flushRealParentContainer(flushedContainerID: RealParentContainerIdentifier) {
        const container = this.getPlacementState().realParentContainers[flushedContainerID.name]
        if (!container) {
            throw new Error(`Container ${flushedContainerID.name} not found in state`)
        }
        for (const sampleID of Object.keys(this.getPlacementState().samples)) {
            const sample = this.getPlacementClass().getSample({ id: Number(sampleID) })
            if (sample.getFromCell()?.getFromContainer()?.sameContainerAs(flushedContainerID)) {
                for (const cellID of Object.values(sample.state.placedAt)) {
                    sample.unplaceAtCell(cellID)
                }
                delete this.getPlacementState().samples[sample.getId()]
            }
        }
        delete this.getPlacementState().realParentContainers[flushedContainerID.name]
    }

    flushTubesWithoutParent() {
        for (const sampleID of Object.keys(this.getPlacementState().samples)) {
            const sample = this.getPlacementClass().getSample({ id: Number(sampleID) })
            if (!sample.getFromCell()) {
                for (const cellID of Object.values(sample.state.placedAt)) {
                    sample.unplaceAtCell(cellID)
                }
                delete this.getPlacementState().samples[sample.getId()]
            }
            this.getPlacementState().tubesWithoutParentContainer.samples = {}
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
        return this.getName() === containerID.name
    }
    isSourceContainer() {
        return this.sameContainerAs(this.context.getSourceContainer().rawIdentifier())
    }
    isDestinationContainer() {
        return !this.isSourceContainer()
    }

    getName(): ParentContainerIdentifier['name'] {
        throw new Error(`${this.constructor.name} does not implement name`)
    }
    getSpec(): CoordinateSpec | undefined {
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
        return this.getPlacementClass().getCell({ fromContainer: this.rawIdentifier(), coordinates: cellID.coordinates })
    }
    getCells(): CellClass[] {
        return Object.keys(this.state.cells).map((cellKey) => this.getCell({ coordinates: cellKey }))
    }
    getCellsInRow(row: number): CellClass[] {
        const [axisRow = [''], axisCol = ['']] = this.getSpec()
        if (row >= axisRow.length) {
            throw new Error(`Row ${row} is out of bounds for container ${this}`)
        }

        const cells = axisCol.map((col) => this.getCell({ coordinates: `${axisRow[row]}${col}` }))
        return cells
    }
    getCellsInCol(col: number): CellClass[] {
        const [axisRow = [''], axisCol = ['']] = this.getSpec()
        if (col >= axisCol.length) {
            throw new Error(`Column ${col} is out of bounds for container ${this}`)
        }

        const cells = axisRow.map((row) => this.getCell({ coordinates: `${row}${axisCol[col]}` }))
        return cells
    }
    getCellsInQuadrant(quadrant: 1 | 2 | 3 | 4): CellClass[] {
        const startRow = quadrant === 1 || quadrant === 2 ? 0 : 1
        const startCol = quadrant === 1 || quadrant === 3 ? 0 : 1
        
        const [axisRow = [''], axisCol = ['']] = this.getSpec()
        const cells: CellClass[] = []
        for (let r = startRow; r < axisRow.length; r += 2) {
            for (let c = startCol; c < axisCol.length; c += 2) {
                cells.push(this.getCell({ coordinates: `${axisRow[r]}${axisCol[c]}` }))
            }
        }

        return cells
    }

    placeAllSamples(sourceContainer: ParentContainerIdentifier) {
        const samples: SampleClass[] = []
        const sourceContainerObject = this.getPlacementClass().getParentContainer(sourceContainer)
        if (sourceContainerObject instanceof RealParentContainerClass) {
            // source containers should have no new placements, only existing samples
            samples.push(...sourceContainerObject.getPlacements().map((s) => s.sample))
        } else {
            samples.push(...sourceContainerObject.getSamples())
        }

        const [axisRow = [''], axisCol = ['']] = this.getSpec()
        const placementLocations = this.placementDestinations(
            samples.map((s) => s.rawIdentifier()),
            `${axisRow[0]}${axisCol[0]}`,
            {
                type: PlacementType.SOURCE_PATTERN,
            }
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
        let placements = this.getPlacements(true).filter((s) => !s.sample.getFromCell()?.getFromContainer()?.sameContainerAs(this.rawIdentifier()))
        if (placements.length === 0) {
            // find any placements of foreign samples
            placements = this.getPlacements(false).filter((s) => !s.sample.getFromCell()?.getFromContainer()?.sameContainerAs(this.rawIdentifier()))
        }
        for (const selection of placements) {
            selection.cell.unplaceSample(selection.sample.rawIdentifier())
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
    invertPlacementSelections(...entries: SamplePlacementIdentifier[]) {
        for (const entry of entries) {
            this.setSelectionOfPlacement(entry, !this.isPlacementSelected(entry))
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
                this.getPlacementState().error ??= `Sample ${cell.getSamples(true)[0].getName()} already exists in cell ${cell.getCoordinates()}`
            }
        }
    }

    placementDestinations(samples: SampleIdentifier[], coordinates: Coordinates, options: PlacementOptions): CellClass[] {
        const [axisRow = [''], axisCol = ['']] = this.getSpec()
        const height = axisRow.length
        const width = axisCol.length

        const newOffsetsList: number[][] = []
        const destinationStartingOffsets = coordinatesToOffsets(this.getSpec(), coordinates)

        if (options.type === PlacementType.SOURCE_PATTERN || options.type === PlacementType.QUADRANT_PATTERN) {
            const sourceContainer = this.context.getSourceContainer()
            if (sourceContainer instanceof TubesWithoutParentClass) {
                throw new Error(`Pattern placement is not supported for tubes without parent`)
            }

            const sourceOffsetsList = samples.map((selection) => {
                const cell = this.getPlacementClass().getSample(selection).getFromCell()
                if (cell == null) {
                    throw new Error(`Sample ${selection.id} is not placed in a cell`)
                }
                return coordinatesToOffsets(cell.getFromContainer().getSpec() ?? [], cell.getCoordinates())
            })

            // find top left corner that tightly bounds all of the selections
            const minOffsets = sourceOffsetsList.reduce((minOffsets, offsets) => {
                return offsets.map((_, index) => offsets[index] < minOffsets[index] ? offsets[index] : minOffsets[index])
            }, sourceOffsetsList[0])

            for (const sourceOffsets of sourceOffsetsList) {
                newOffsetsList.push(
                    this.getSpec().map(
                        (_: CoordinateAxis, index: number) => {
                            const relativeOffset = sourceOffsets[index] - minOffsets[index]
                            return relativeOffset * ((options.type === PlacementType.QUADRANT_PATTERN ? 1 : 0) + 1) + destinationStartingOffsets[index]
                        }
                    )
                )
            }
        } else if (options.type === PlacementType.SEQUENTIAL) {
            const sourceContainer = this.context.getSourceContainer()

            const relativeOffsetByIndices: Record<number, number> = {}

            //#region populate relativeOffsetByIndices
            const placementSamples: (PlacementSample & { index: number })[] = []
            for (let index = 0; index < samples.length; index++) {
                const sample = this.getPlacementClass().getSample(samples[index])
                const placementSample: typeof placementSamples[number] = {
                    index,
                    id: sample.getId(),
                    selected: false, // it will be set later
                    name: sample.getName(),
                    containerName: sample.getContainerName(),
                    coordinates: sample.getFromCell()?.getCoordinates(),
                    fromCell: sample.getFromCell()?.rawIdentifier() ?? null,
                    count: -1, // ignored but type-expected for comparePlacementSamples
                }
                if (sourceContainer instanceof TubesWithoutParentClass) {
                    placementSample.selected = sourceContainer.isSampleSelected(sample.rawIdentifier())
                } else {
                    const fromCell = sample.getFromCell()
                    if (!fromCell) {
                        throw new Error(`Sample ${sample.getId()} is not placed in a cell from ${sourceContainer}`)
                    }
                    placementSample.selected = sourceContainer.isPlacementSelected({ sample: sample.rawIdentifier(), cell: fromCell.rawIdentifier() })
                }
                placementSamples.push(placementSample)
            }
            placementSamples.sort((a, b) => comparePlacementSamples(a, b, sourceContainer.getSpec()))
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

                const placementDirection = options.direction
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
        }

        const results: CellClass[] = []
        for (const offsets of newOffsetsList) {
            try {
                results.push(this.getCell({ coordinates: offsetsToCoordinates(offsets, this.getSpec()) }))
            } catch (e) {
                this.context.placementState.error ??= e.message
            }
        }
        return results
    }


    toString() {
        return `RealContainerParentClass(name=${this.getName()})`
    }

    // TODO: use dictionary parameter
    getPlacements(onlySelected = false): SamplePlacement[] {
        return Object.values(this.state.cells)
            .flatMap((cell) =>
                Object.keys(cell.samples).map((id) => new SamplePlacement(this.context, {
                    sample: { id: Number(id) },
                    cell
                }))
            )
            .filter((samplePlacement) => onlySelected ? this.isPlacementSelected(samplePlacement.rawIdentifier()) : true)
    }

    getName() {
        return this.state.name
    }
    getSpec() {
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
    invertSelections(...sampleIDs: SampleIdentifier[]) {
        for (const sampleID of sampleIDs) {
            this.setSelectionOfSample(sampleID, !this.isSampleSelected(sampleID))
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
            .map(id => this.getPlacementClass().getSample({ id: Number(id) }))
            .filter((s) => onlySelected ? this.state.samples[s.getId()]?.selected : true)
    }

    getName() {
        return null
    }

    getSpec() {
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
        if (this.getFromContainer().isSourceContainer()) {
            // toggle selection in source container branch
            const existingSample = this.findExistingSample()
            if (existingSample) {
                this.toggleSelection(existingSample.rawIdentifier())
            }
            return
        }

        const selections: SampleClass[] = []
        const sourceContainer = this.context.getSourceContainer()
        if (sourceContainer instanceof TubesWithoutParentClass) {
            selections.push(...sourceContainer.getSamples(true))
        } else {
            // source containers should have no new placements
            // so no need to filter out new placements
            selections.push(...sourceContainer.getPlacements(true).map((s => s.sample)))
        }

        if (selections.length > 0) {
            // placement branch
            const destinationCells = this.getFromContainer().placementDestinations(
                selections.map((s) => s.rawIdentifier()),
                this.getCoordinates(),
                {
                    type: this.context.placementState.placementType,
                    direction: this.context.placementState.placementDirection,
                }
            )
            if (destinationCells.length !== selections.length) {
                throw new Error(`Destination cells length does not match selections length`)
            }
            for (let i = 0; i < destinationCells.length; i++) {
                selections[i].placeAtCell(destinationCells[i].rawIdentifier())
                const cell = selections[i].getFromCell()
                if (cell !== null) {
                    cell.setSelectionOfSample(selections[i].rawIdentifier(), false)
                } else {
                    this.context.placementClass.getTubesWithoutParent().setSelectionOfSample(selections[i].rawIdentifier(), false)
                }
            }
            this.getFromContainer().clearPreviews()
        } else {
            // toggle selection in destination container branch
            this.getFromContainer().togglePlacementSelections(
                ...this.getSamplePlacements(false).map((s) => s.rawIdentifier())
            )
        }
    }

    enter() {
        if (this.getFromContainer().isSourceContainer()) {
            return
        }
        const samples: SampleClass[] = []
        const sourceContainer = this.context.getSourceContainer()
        if (sourceContainer instanceof TubesWithoutParentClass) {
            samples.push(...sourceContainer.getSamples(true))
        } else {
            // source containers should have no new placements
            samples.push(...sourceContainer.getPlacements(true).map((s => s.sample)))
        }
        const destinations = this.getFromContainer().placementDestinations(
            samples.map((s) => s.rawIdentifier()),
            this.getCoordinates(),
            {
                type: this.context.placementState.placementType,
                direction: this.context.placementState.placementDirection,
            }
        )
        this.getFromContainer().setPreviews(
            samples.map((s) => s.getFromCell()?.rawIdentifier() ?? { coordinates: '' }),
            destinations.map((c) => c.rawIdentifier())
        )
    }
    exit() {
        this.getFromContainer().clearPreviews()
    }

    toString() {
        return `Cell(container=${this.getFromContainer()}, coordinates=${this.getCoordinates()})`
    }

    isSampleSelected(sampleID: SampleIdentifier) {
        return this.getSampleEntryState(sampleID).selected
    }
    setSelectionOfSample(sampleID: SampleIdentifier, selected: boolean) {
        const sample = this.getPlacementClass().getSample(sampleID)
        if (this.getFromContainer().isDestinationContainer() && sample.getFromCell()?.sameCellAs(this.rawIdentifier())) {
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
            this.getPlacementClass().getSample(sampleID).placeAtCell(this.rawIdentifier(), false)
        }
    }
    unplaceSample(sampleID: SampleIdentifier, twoWayPlacement = true) {
        const sample = this.getPlacementClass().getSample(sampleID)

        if (this.state.samples[sampleID.id]) {
            if (sample.getFromCell()?.sameCellAs(this.rawIdentifier())) {
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
            .map(id => this.getPlacementClass().getSample({ id: Number(id) }))
            .filter((sample) => includeExistinSamples
                ? true
                : !sample.getFromCell()?.sameCellAs(this.rawIdentifier())
            )
    }
    getSamplePlacements(includeExistingSamples = true): SamplePlacement[] {
        return this.getSamples(includeExistingSamples)
            .map((sample) => new SamplePlacement(this.context, { sample: sample.rawIdentifier(), cell: this.rawIdentifier() }))
    }
    getSampleEntryState(sampleID: SampleIdentifier) {
        const entry = this.state.samples[sampleID.id]
        if (!entry) {
            throw new Error(`Sample ${sampleID.id} not found in cell ${this}`)
        }
        return entry
    }

    findExistingSample() {
        return this.getSamples().find((sample) => sample.getFromCell() && sample.getFromCell()?.sameCellAs(this.rawIdentifier()))
    }

    sameParentContainerAs(cellID: Pick<CellIdentifier, 'fromContainer'>) {
        return this.getFromContainer().getName() === cellID.fromContainer.name
    }

    getFromContainer() {
        return this.getPlacementClass().getRealParentContainer(this.state.fromContainer)
    }

    getCoordinates() {
        return this.state.coordinates
    }

    getPreview() {
        return this.state.preview
    }

    sameCellAs(cellID: CellIdentifier) {
        return this.state.fromContainer.name === cellID.fromContainer.name &&
            this.state.coordinates === cellID.coordinates
    }

    rawIdentifier(): CellIdentifier {
        return {
            fromContainer: { name: this.getFromContainer().getName() },
            coordinates: this.getCoordinates()
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
            this.getPlacementClass().getCell(cellID).placeSample(this.rawIdentifier(), false)
        }
        if (!this.state.placedAt.find(placedAt => placedAt.fromContainer.name === cellID.fromContainer.name && placedAt.coordinates === cellID.coordinates)) {
            this.state.placedAt.push(cellID)
        }
    }
    unplaceAtCell(cellID: CellIdentifier, twoWayPlacement = true) {
        if (this.getFromCell()?.sameCellAs(cellID)) {
            throw new Error(`Sample ${this} is an existing sample in this cell ${this.getPlacementClass().getCell(cellID)}`)
        }
        const index = this.state.placedAt.findIndex(cell =>
            cell.fromContainer.name === cellID.fromContainer.name &&
            cell.coordinates === cellID.coordinates
        )
        if (index !== -1) {
            this.state.placedAt.splice(index, 1)
        }
        if (twoWayPlacement) {
            this.getPlacementClass().getCell(cellID).unplaceSample(this.rawIdentifier(), false)
        }
    }

    toString() {
        return `Sample(id=${this.getId()}, name=${this.getName()}, container=${this.getFromCell()?.getFromContainer() ?? this.getPlacementClass().getTubesWithoutParent()}, cell=${this.getFromCell()})`
    }

    sameSampleAs(sampleID: SampleIdentifier) {
        return this.state.id === sampleID.id
    }

    getId() {
        return this.state.id
    }
    getName() {
        return this.state.name
    }
    getContainerName() {
        return this.state.containerName
    }
    getFromCell() {
        return this.state.fromCell ? this.getPlacementClass().getCell(this.state.fromCell) : null
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
        this.sample = this.getPlacementClass().getSample(sample)
        this.cell = this.getPlacementClass().getCell(cell)
    }

    getSelected() {
        return this.cell.isSampleSelected(this.sample.rawIdentifier())
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