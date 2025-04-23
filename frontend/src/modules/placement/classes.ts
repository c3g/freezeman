import { CoordinateAxis } from "../../models/fms_api_models"
import { compareArray, coordinatesToOffsets, offsetsToCoordinates } from "../../utils/functions"
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
                    containerName: 'TODO: get the name of the tube',
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
                const [ axisRow = [''], axisCol = [''] ] = payload.spec
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
                    containerName: "TODO: use the name of the tube if it's in a tube",
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
            if (sample.fromCell?.fromContainer.sameContainerAs(flushedContainerID)) {
                for (const cellID of Object.values(sample.state.placedAt)) {
                    sample.unplaceAtCell(cellID)
                }
            }
            delete this.placementState.samples[sample.id]
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

    getCell(cellID: CellIdentifier) {
        return new CellClass(this.context, cellID)
    }

    getSample(sampleID: SampleIdentifier) {
        return new SampleClass(this.context, sampleID)
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
        if (sourceContainer.name) {
            // source containers should have no new placements, only existing samples
            samples.push(...this.placement.getRealParentContainer(sourceContainer).getSortedPlacements().map((s) => s.sample))
        } else {
            samples.push(...this.placement.getTubesWithoutParent().getSortedSamples())
        }

        const [axisRow = [''], axisCol = ['']] = this.spec
        const placementLocations = this.placementDestinations(samples, `${axisRow[0]}${axisCol[0]}`, PlacementType.PATTERN)
        if (placementLocations.length !== samples.length) {
            throw new Error(`Placement locations length does not match samples length`)
        }
        for (let i = 0; i < placementLocations.length; i++) {
            const sample = samples[i]
            const destinationCell = placementLocations[i]
            sample.placeAtCell(destinationCell.rawIdentifier())
        }
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
            this.state.cells[cellKey].preview = null
        }
    }
    setPreviews(sources: Pick<CellIdentifier, 'coordinates'>[], destinations: CellIdentifier[]) {
        this.clearPreviews()
        for (let index = 0; index < sources.length && index < destinations.length; index++) {
            const source = sources[index]
            const destination = destinations[index]
            const cell = this.getCell(destination)
            cell.state.preview = source.coordinates ?? ''
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

                const relativeOffsetByIndices = Object.keys(samples).sort((indexA, indexB) => {
                    const a = samples[parseInt(indexA)]
                    const b = samples[parseInt(indexB)]

                    if (sourceContainer instanceof TubesWithoutParentClass) {
                        return sourceContainer.compareSamples({ sample: a }, { sample: b })
                    } else {
                        const aCell = this.placement.getSample(a).fromCell
                        const bCell = this.placement.getSample(b).fromCell
                        if (!aCell || !bCell) {
                            throw new Error(`Sample ${a.id} or ${b.id} do not exist in the source container`)
                        }
                        return sourceContainer.compareSamples(
                            { sample: a, cell: aCell },
                            { sample: b, cell: bCell }
                        )
                    }
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
        const sample = this.placement.getSample(placedSample.sample)
        return new SamplePlacement(this.context, { sample, cell })
    }

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

    getSortedPlacements(onlySelected = false): SamplePlacement[] {
        return this.getPlacements(onlySelected).sort((a, b) => this.compareSamples(a, b))
    }

    sameContainerAs(containerID: ParentContainerIdentifier) {
        return this.name === containerID.name
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
        return this.#getSampleEntry(sampleID).selected
    }
    selectSample(sampleID: SampleIdentifier) {
        if (sampleID.id in this.state.samples) {
            this.#getSampleEntry(sampleID).selected = true
        }
    }
    unSelectSample(sampleID: SampleIdentifier) {
        if (sampleID.id in this.state.samples) {
            this.#getSampleEntry(sampleID).selected = false
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

    compareSamples(a: Pick<SamplePlacementIdentifier, 'sample'>, b: Pick<SamplePlacementIdentifier, 'sample'>) {
        const MAX = 128

        let orderA = MAX
        let orderB = MAX

        const A = this.placement.getSample(a.sample)
        const B = this.placement.getSample(b.sample)

        if (this.isSampleSelected(A)) orderA -= MAX / 2
        if (this.isSampleSelected(B)) orderB -= MAX / 2

        if (A.name < B.name) orderA -= MAX / 8
        if (A.name > B.name) orderB -= MAX / 8

        if (A.containerName < B.containerName) orderA -= MAX / 16
        if (A.containerName > B.containerName) orderB -= MAX / 16

        if (A.projectName < B.projectName) orderA -= MAX / 32
        if (A.projectName > B.projectName) orderB -= MAX / 32

        return orderA - orderB
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

    getSamples() {
        return Object.keys(this.state.samples)
            .map(id => this.placement.getSample({ id: Number(id) }))
    }

    getSortedSamples(onlySelected = false) {
        return this.getSamples()
            .filter((s) => onlySelected ? this.state.samples[s.id]?.selected : true)
            .sort((a, b) => this.compareSamples({ sample: a }, { sample: b }))
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
        if (this.fromContainer.sameContainerAs(this.context.sourceContainer)) {
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
                selections[i].placeAtCell(destinationCells[i].rawIdentifier())
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
        if (this.fromContainer.sameContainerAs(this.context.sourceContainer)) {
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
    setSelection(sampleID: SampleIdentifier, selected: boolean) {
        const sample = this.placement.getSample(sampleID)
        if (!this.fromContainer.sameContainerAs(this.context.sourceContainer) && sample.fromCell && sample.fromCell.sameCellAs(this)) {
            // don't do selection if the sample is already existing in the destination container
            this.getSampleEntryState(sampleID).selected = false
            return
        }
        this.getSampleEntryState(sampleID).selected = selected
    }
    toggleSelection(sampleID: SampleIdentifier) {
        this.setSelection(sampleID, !this.isSampleSelected(sampleID))
    }

    placeSample(sampleID: SampleIdentifier, twoWayPlacement = true) {
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
        if (!this.state.placedAt.find(placedAt => placedAt.fromContainer.name === cellID.fromContainer.name && placedAt.coordinates === cellID.coordinates)) {
            this.state.placedAt.push(cellID)
        }
        if (twoWayPlacement) {
            this.placement.getCell(cellID).placeSample(this.rawIdentifier(), false)
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
}
export interface SamplePlacementIdentifier { sample: SampleIdentifier, cell: CellIdentifier }