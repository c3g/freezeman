import { describe, expect, test } from '@jest/globals';
import reducer, { loadContainers, PlacementState, PlacementContainerState, LoadContainersPayload, CellIdentifier, CellState, MouseOnCellPayload, internals, PlacementOptions } from './reducers'
import { CoordinateSpec } from '../../models/fms_api_models';
import produce from 'immer';

const {
    initialState,
    createEmptyCells,
    coordinatesToOffsets,
    offsetsToCoordinates,
    placementDestinationLocations,
    clickCellHelper,
    setPreviews
} = internals

const srcContainer: LoadContainersPayload[number] = {
    type: 'source',
    name: 'Source Container',
    spec: [['A', 'B', 'C'], ['01', '02', '03']] as CoordinateSpec,
    containers: [{
        coordinates: 'A01',
        sample: 1
    }, {
        coordinates: 'B02',
        sample: 2
    }, {
        coordinates: 'C03',
        sample: 3
    }]
}

const dstContainer: LoadContainersPayload[number] = {
    type: 'destination',
    name: 'Destination Container',
    spec: [['A', 'B', 'C', 'D'], ['01', '02', '03', '04']] as CoordinateSpec,
    containers: [{
        coordinates: 'A01',
        sample: 1
    }, {
        coordinates: 'B02',
        sample: 2
    }, {
        coordinates: 'C03',
        sample: 3
    }, {
        coordinates: 'D04',
        sample: 4
    }]
}

describe('loadSamplesAndContainers', () => {
    test('initialize with 0 containers and samples', () => {
        expect(reducer(
            initialState,
            loadContainers([])
        )).toEqual(initialState)
    })
    
    test('initialize with 2 containers containing more than one container', () => {
        function makeExpectedParentContainerState(parentContainer: LoadContainersPayload[number]): PlacementState['parentContainers'] {
            const { type, name, spec, containers } = parentContainer
            return {
                [name]: {
                    type,
                    spec,
                    cells: {
                        ...createEmptyCells(spec),
                        ...containers.reduce((cells: PlacementContainerState['cells'], c) => {
                            cells[c.coordinates] = {
                                preview: false,
                                selected: false,
                                sample: c.sample,
                                samplePlacedAt: null,
                                samplePlacedFrom: null
                            }
                            return cells
                        }, {})
                    }
                }
            }
        }
    
        const expectedState: PlacementState = {
            ...initialState,
            parentContainers: {
                ...makeExpectedParentContainerState(srcContainer),
                ...makeExpectedParentContainerState(dstContainer)
            }
        }
    
        expect(reducer(
            initialState,
            loadContainers([srcContainer, dstContainer])
        )).toEqual(expectedState)
    })    
})

describe('coordinatesToOffsets', () => {
    type GoodTestCase = { spec: CoordinateSpec, coordinates: string, offsets: number[] }
    const goodTestCases: GoodTestCase[] = [
        { spec: dstContainer.spec, coordinates: "A01", offsets: [0, 0] },
        { spec: dstContainer.spec, coordinates: "B02", offsets: [1, 1] },
        { spec: dstContainer.spec, coordinates: "C03", offsets: [2, 2] },
        { spec: dstContainer.spec, coordinates: "D04", offsets: [3, 3] },
        { spec: dstContainer.spec, coordinates: "D01", offsets: [3, 0] },
    ]
    test.each(goodTestCases)('successfully convert coordinates ($coordinates) to index offsets ($offsets)', ({spec, coordinates, offsets}) => {     
        expect(coordinatesToOffsets(spec, coordinates)).toEqual(offsets)
    })

    type BadTestCase = { spec: CoordinateSpec, coordinates: string, specString: string }
    const badTestCases: BadTestCase[] = [
        { spec: srcContainer.spec, coordinates: "D04", specString: JSON.stringify(srcContainer.spec)},
        { spec: dstContainer.spec, coordinates: "E05", specString: JSON.stringify(srcContainer.spec)},
    ]
    test.each(badTestCases)('throw error when converting invalid coordinates ($coordinates) based on spec ($specString)', ({spec, coordinates}) => {
        expect(() => (coordinatesToOffsets(spec, coordinates))).toThrow()
    })
})

describe('offsetsToCoordinates', () => {
    type GoodTestCase = { spec: CoordinateSpec, coordinates: string, offsets: number[] }
    const goodTestCases: GoodTestCase[] = [
        { spec: dstContainer.spec, coordinates: "A01", offsets: [0, 0] },
        { spec: dstContainer.spec, coordinates: "B02", offsets: [1, 1] },
        { spec: dstContainer.spec, coordinates: "C03", offsets: [2, 2] },
        { spec: dstContainer.spec, coordinates: "D04", offsets: [3, 3] },
        { spec: dstContainer.spec, coordinates: "D01", offsets: [3, 0] },
    ]
    test.each(goodTestCases)('successfully convert index offsets ($offsets) to coordinates ($coordinates)', ({spec, coordinates, offsets}) => {
        expect(offsetsToCoordinates(offsets, spec)).toEqual(coordinates)
    })

    type BadTestCase = { spec: CoordinateSpec, offsets: number[], specString: string }
    const badTestCases: BadTestCase[] = [
        { spec: dstContainer.spec, offsets: [-1, -1], specString: JSON.stringify(dstContainer.spec) },
        { spec: dstContainer.spec, offsets: [4, 4], specString: JSON.stringify(dstContainer.spec) },
        { spec: srcContainer.spec, offsets: [3, 3], specString: JSON.stringify(srcContainer.spec) },
    ]
    test.each(badTestCases)('throw error when converting invalid index offsets ($offsets) based on spec ($specString)', ({spec, offsets}) => {
        expect(() => offsetsToCoordinates(offsets, spec)).toThrow()
    })
})

describe('placementDestinationLocations', () => {
    const state = reducer(initialState, loadContainers([srcContainer, dstContainer]))

    type GoodTestCase = { state: PlacementState, sources: CellIdentifier[], destination: CellIdentifier, placementOptions: PlacementOptions, expected: CellIdentifier[] }
    const goodTestCases: GoodTestCase[] = [
        // group row
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "A01" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "C03" }
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "B02" },
            placementOptions: { type: 'group', direction: 'row' },
            expected: [
                { parentContainer: dstContainer.name, coordinates: "B02" },
                { parentContainer: dstContainer.name, coordinates: "B03" },
                { parentContainer: dstContainer.name, coordinates: "B04" }
            ]
        },
        // ordered by sample id
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "C03" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "A01" },
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "B02" },
            placementOptions: { type: 'group', direction: 'row' },
            expected: [
                { parentContainer: dstContainer.name, coordinates: "B04" },
                { parentContainer: dstContainer.name, coordinates: "B03" },
                { parentContainer: dstContainer.name, coordinates: "B02" },
            ]
        },
        // group-column
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "A01" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "C03" }
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "B02" },
            placementOptions: { type: 'group', direction: 'column' },
            expected: [
                { parentContainer: dstContainer.name, coordinates: "B02" },
                { parentContainer: dstContainer.name, coordinates: "C02" },
                { parentContainer: dstContainer.name, coordinates: "D02" }
            ]
        },
        // ordered by sample id
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "C03" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "A01" },
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "B02" },
            placementOptions: { type: 'group', direction: 'column' },
            expected: [
                { parentContainer: dstContainer.name, coordinates: "D02" },
                { parentContainer: dstContainer.name, coordinates: "C02" },
                { parentContainer: dstContainer.name, coordinates: "B02" },
            ]
        },
        // pattern
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "C02" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "B03" },
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "C03" },
            placementOptions: { type: 'pattern' },
            expected: [
                { parentContainer: dstContainer.name, coordinates: "D03" },
                { parentContainer: dstContainer.name, coordinates: "C03" },
                { parentContainer: dstContainer.name, coordinates: "C04" },
            ]
        },
        // pattern
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "C02" },
                { parentContainer: srcContainer.name, coordinates: "C03" },
                { parentContainer: srcContainer.name, coordinates: "B03" },
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "C03" },
            placementOptions: { type: 'pattern' },
            expected: [
                { parentContainer: dstContainer.name, coordinates: "D03" },
                { parentContainer: dstContainer.name, coordinates: "D04" },
                { parentContainer: dstContainer.name, coordinates: "C04" },
            ]
        },
    ]
    test.each(goodTestCases)('successfully generate destination locations from source samples', ({ state, sources, destination, placementOptions, expected }) => {
        expect(placementDestinationLocations(state, sources, destination, placementOptions)).toEqual(expected)
    })

    type BadTestCase = { state: PlacementState, sources: CellIdentifier[], destination: CellIdentifier, placementOptions: PlacementOptions }
    const badTastCases: BadTestCase[] = [
        // group row
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "A01" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "C03" }
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "B03" },
            placementOptions: { type: 'group', direction: 'row' }
        },
        // group column
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "A01" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "C03" }
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "C02" },
            placementOptions: { type: 'group', direction: 'column' }
        },
        // pattern
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "C02" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "B03" },
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "D04" },
            placementOptions: { type: 'pattern' },
        },
    ]
    test.each(badTastCases)('throw error when there is risk of going out of bounds', ({ state, sources, destination, placementOptions }) => {
        expect(() => placementDestinationLocations(state, sources, destination, placementOptions)).toThrow()
    })

})

describe('select all samples from source, preview them on destination and then place', () => {
    let state = reducer(initialState, loadContainers([srcContainer, dstContainer]))

    const sourceCoords = srcContainer.containers.map((container) => container.coordinates)

    test('select all samples from source', () => {
        state = sourceCoords.reduce((state, coordinates) => {
            return produce(state, (draft) => clickCellHelper(draft, {
                parentContainer: srcContainer.name,
                coordinates,
            }))
        }, state)
        sourceCoords.map((coordinates) => state.parentContainers[srcContainer.name]?.cells[coordinates]).forEach((cell) => {
            expect(cell?.selected).toEqual(true)
        })
        expect(state.error).toBeUndefined()
    })

    const destCoords = ['D01', 'D02', 'D03']
    const dstLocation: MouseOnCellPayload = {
        parentContainer: dstContainer.name,
        coordinates: 'D01',
    }

    test('preview destinations', () => {
        state = produce(state, (draft) => setPreviews(draft, dstLocation, true))
        destCoords.map((coordinates) => state.parentContainers[dstContainer.name]?.cells[coordinates]).forEach((cell) => {
            expect(cell?.preview).toEqual(true)
        })
    })

    test('place samples into destination from source', () => {
        state = produce(state, (draft) => clickCellHelper(draft, dstLocation))

        expect(state.error).toBeUndefined()

        sourceCoords.map((coordinates) => state.parentContainers[srcContainer.name]?.cells[coordinates]).forEach((cell) => {
            expect(cell?.samplePlacedAt).toBeDefined()
            expect(cell?.selected).toEqual(false)
        })
        destCoords.map((coordinates) => state.parentContainers[dstContainer.name]?.cells[coordinates]).forEach((cell) => {
            expect(cell?.samplePlacedFrom).toBeDefined()
            expect(cell?.preview).toEqual(false)
        })
    })
})