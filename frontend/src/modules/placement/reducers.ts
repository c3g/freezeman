import { Draft, PayloadAction, createSlice, original } from "@reduxjs/toolkit"
import { Sample } from "../../models/frontend_models"
import { CoordinateSpec } from "../../models/fms_api_models"
import { CellIdentifier, ParentContainerIdentifier, PlacementDirections, PlacementGroupOptions, PlacementOptions, PlacementState, PlacementType, RealParentContainerIdentifier, SampleIdentifier, TubesWithoutParentContainerIdentifier } from "./models"
import { PlacementClass, SamplePlacementIdentifier } from "./classes"

export type LoadContainerPayload = LoadParentContainerPayload | LoadTubesWithoutParentPayload
export interface MouseOnCellPayload extends CellIdentifier {
    context: {
        source: ParentContainerIdentifier
    }
}
export type MultiSelectPayload = {
    forcedSelectedValue?: boolean
    context: {
        source?: ParentContainerIdentifier
    }
} & ({
    parentContainer: RealParentContainerIdentifier
    type: 'row'
    row: number
} | {
    parentContainer: RealParentContainerIdentifier
    type: 'column'
    column: number
} | {
    parentContainer: ParentContainerIdentifier
    type: 'all'
} | {
    parentContainer: RealParentContainerIdentifier
    type: 'samples-placements'
    samples: Array<SamplePlacementIdentifier>
} | {
    parentContainer: TubesWithoutParentContainerIdentifier
    type: 'sample-ids'
    samples: Array<SampleIdentifier>
})
export interface PlaceAllSourcePayload {
    source: ParentContainerIdentifier
    destination: RealParentContainerIdentifier
}

const initialState: PlacementState = {
    placementType: PlacementType.GROUP,
    placementDirection: PlacementDirections.COLUMN,
    tubesWithoutParentContainer: { name: null, samples: {} },
    realParentContainers: {},
    samples: {},
    error: undefined,
} as const

const slice = createSlice({
    name: 'PLACEMENT',
    initialState,
    reducers: {
        loadContainer: reducerWithThrows((state, payload: LoadContainerPayload) =>
            new PlacementClass(state, undefined).loadContainerPayload(payload)
        ),
        setPlacementType(state, action: PayloadAction<PlacementOptions['type']>) {
            state.placementType = action.payload
        },
        setPlacementDirection(state, action: PayloadAction<PlacementGroupOptions['direction']>) {
            state.placementDirection = action.payload
        },
        clickCell: reducerWithThrows((state, payload: MouseOnCellPayload) =>
            new PlacementClass(state, payload.context.source)
                .getCell(payload)
                .click()
        ),
        placeAllSource: reducerWithThrows((state, payload: PlaceAllSourcePayload) =>
            new PlacementClass(state, payload.source)
                .getRealParentContainer(payload.destination)
                .placeAllSamples(payload.source)
        ),
        multiSelect: reducerWithThrows((state, payload: MultiSelectPayload) => {
            if (payload.parentContainer.name === null) {
                const samples: SampleIdentifier[] = []
                const container = new PlacementClass(state, payload.context.source).getTubesWithoutParent()
                if (payload.type === 'all') {
                    samples.push(...container.getSamples())
                } else if (payload.type === 'sample-ids') {
                    samples.push(...payload.samples)
                }
                if (payload.forcedSelectedValue !== undefined) {
                    if (payload.forcedSelectedValue) {
                        samples.forEach((s) => container.selectSample(s))
                    } else {
                        samples.forEach((s) => container.unSelectSample(s))
                    }
                } else {
                    container.toggleSelections(...samples)
                }
            } else {
                const samplePlacements: SamplePlacementIdentifier[] = []
                const container = new PlacementClass(state, payload.context.source).getRealParentContainer(payload.parentContainer)
                switch (payload.type) {
                    case 'all': {
                        samplePlacements.push(...container.getPlacements())
                        break
                    }
                    case 'samples-placements': {
                        samplePlacements.push(...payload.samples)
                        break
                    }
                    case 'column': {
                        samplePlacements.push(...container.getCellsInCol(payload.column).flatMap((c) => c.getSamplePlacements()))
                        break
                    }
                    case 'row': {
                        samplePlacements.push(...container.getCellsInRow(payload.row).flatMap((c) => c.getSamplePlacements()))
                        break
                    }
                }
                if (payload.forcedSelectedValue !== undefined) {
                    if (payload.forcedSelectedValue) {
                        samplePlacements.forEach((s) => container.selectPlacement(s))
                    } else {
                        samplePlacements.forEach((s) => container.unSelectPlacement(s))
                    }
                } else {
                    container.togglePlacementSelections(...samplePlacements)
                }
            }
        }),
        onCellEnter: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            new PlacementClass(state, payload.context.source).getCell(payload).enter()
        }),
        onCellExit: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            new PlacementClass(state, payload.context.source).getCell(payload).exit()
        }),
        undoPlacements: reducerWithThrows((state, parentContainer: RealParentContainerIdentifier) => {
            new PlacementClass(state, undefined).getRealParentContainer(parentContainer).undoPlacements()
        }),
        flushContainers(state, action: PayloadAction<Array<ParentContainerIdentifier> | undefined>) {
            if (!action.payload) {
                state.realParentContainers = {}
                state.tubesWithoutParentContainer.samples = {}
                state.samples = {}
                return
            }
            const placement = new PlacementClass(state, undefined)
            for (const c of action.payload) {
                if (c.name === null) {
                    placement.flushTubesWithoutParent()
                } else {
                    placement.flushRealParentContainer(c)
                }
            }
        },
        flushPlacement(state) {
            Object.assign(state, initialState)
        }
    }
})

export const {
    loadContainer,
    setPlacementType,
    setPlacementDirection,
    clickCell,
    placeAllSource,
    onCellEnter,
    onCellExit,
    multiSelect,
    undoPlacements,
    flushContainers,
    flushPlacement,
} = slice.actions
export default slice.reducer

function reducerWithThrows<P>(func: (state: Draft<PlacementState>, action: P) => void) {
    return (state: Draft<PlacementState>, action: PayloadAction<P>) => {
        try {
            state.error = undefined
            func(state, action.payload)
        } catch (error) {
            const originalState = original(state) ?? initialState
            Object.assign(state, originalState)
            state.error = `${error.message}\n${error.stack}`
        }
    }
}

interface LoadParentContainerPayload {
    parentContainerName: string
    spec: CoordinateSpec
    cells: { coordinates: string, sample: Sample['id'], name: string, containerName: string, projectName: string }[]
}
interface LoadTubesWithoutParentPayload {
    parentContainerName: null
    cells: { coordinates?: undefined, sample: Sample['id'], name: string, containerName: string, projectName: string }[]
}

