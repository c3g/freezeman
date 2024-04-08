import { describe, expect, test } from '@jest/globals';
import reducer, { loadSamplesAndContainers, clickCell, PlacementState, PlacementContainerState, LoadSamplesAndContainersPayload, CellIdentifier, CellState, MouseOnCellPayload, PlacementType, PlacementDirection, internals } from './reducers'
import { CoordinateSpec } from '../../models/fms_api_models';

const {
    initialState,
    createEmptyCells,
    coordinatesToOffsets,
    offsetsToCoordinates,
    placementDestinationLocations,
    clickCellHelper,
} = internals

type LoadParentContainerPayload = LoadSamplesAndContainersPayload['parentContainers'][number]

const srcContainer: LoadParentContainerPayload = {
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

const dstContainer: LoadParentContainerPayload = {
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
            loadSamplesAndContainers({ parentContainers: [] })
        )).toEqual(initialState)
    })
    
    test('initialize with 2 containers containing more than one container', () => {
        function makeExpectedParentContainerState(parentContainer: LoadParentContainerPayload): PlacementState['parentContainers'] {
            const { name, spec, containers } = parentContainer
            return {
                [name]: {
                    spec,
                    cells: {
                        ...createEmptyCells(spec),
                        ...containers.reduce((cells: PlacementContainerState['cells'], c) => {
                            cells[c.coordinates] = { preview: false, selected: false, sample: c.sample }
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
            loadSamplesAndContainers({ parentContainers: [srcContainer, dstContainer] })
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

    type BadTestCase = { spec: CoordinateSpec, coordinates: string }
    const badTestCases: BadTestCase[] = [
        { spec: srcContainer.spec, coordinates: "D04"},
        { spec: dstContainer.spec, coordinates: "E05"},
    ]
    test.each(badTestCases)('throw error when converting invalid coordinates ($coordinates) based on spec', ({spec, coordinates}) => {
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

    type BadTestCase = { spec: CoordinateSpec, offsets: number[] }
    const badTestCases: BadTestCase[] = [
        { spec: dstContainer.spec, offsets: [-1, -1] },
        { spec: dstContainer.spec, offsets: [4, 4] },
        { spec: srcContainer.spec, offsets: [3, 3] },
    ]
    test.each(badTestCases)('throw error when converting invalid index offsets ($offsets) based on spec', ({spec, offsets}) => {
        expect(() => offsetsToCoordinates(offsets, spec)).toThrow()
    })
})

describe('placementDestinationLocations', () => {
    const state = reducer(initialState, loadSamplesAndContainers({ parentContainers: [srcContainer, dstContainer] }))

    type GoodTestCase = { state: PlacementState, sources: CellIdentifier[], destination: CellIdentifier, placementType: PlacementType, placementDirection: PlacementDirection, expected: CellIdentifier[] }
    const goodTestCases: GoodTestCase[] = [
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "A01" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "C03" }
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "B02" },
            placementType: 'group',
            placementDirection: 'row',
            expected: [
                { parentContainer: dstContainer.name, coordinates: "B02" },
                { parentContainer: dstContainer.name, coordinates: "B03" },
                { parentContainer: dstContainer.name, coordinates: "B04" }
            ]
        },
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "A01" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "C03" }
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "B02" },
            placementType: 'group',
            placementDirection: 'column',
            expected: [
                { parentContainer: dstContainer.name, coordinates: "B02" },
                { parentContainer: dstContainer.name, coordinates: "C02" },
                { parentContainer: dstContainer.name, coordinates: "D02" }
            ]
        },
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "A01" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "C03" }
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "B02" },
            placementType: 'pattern',
            placementDirection: 'column',
            expected: [
                { parentContainer: dstContainer.name, coordinates: "B02" },
                { parentContainer: dstContainer.name, coordinates: "C03" },
                { parentContainer: dstContainer.name, coordinates: "D04" }
            ]
        },
    ]
    test.each(goodTestCases)('successfully generate destination locations from source samples with type ($placementType) and direction ($placementDirection)', ({ state, sources, destination, placementType, placementDirection, expected }) => {
        expect(placementDestinationLocations(state, sources, destination, placementType, placementDirection)).toEqual(expected)
    })

    type BadTestCase = { state: PlacementState, sources: CellIdentifier[], destination: CellIdentifier, placementType: PlacementType, placementDirection: PlacementDirection }
    const badTastCases: BadTestCase[] = [
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "A01" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "C03" }
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "B03" },
            placementType: 'group',
            placementDirection: 'row',
        },
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "A01" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "C03" }
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "C02" },
            placementType: 'group',
            placementDirection: 'column',
        },
        {
            state: state,
            sources: [
                { parentContainer: srcContainer.name, coordinates: "A01" },
                { parentContainer: srcContainer.name, coordinates: "B02" },
                { parentContainer: srcContainer.name, coordinates: "C03" }
            ],
            destination: { parentContainer: dstContainer.name, coordinates: "C03" },
            placementType: 'pattern',
            placementDirection: 'column',
        },
    ]
    test.each(badTastCases)('throw error when there is risk of going out of bounds with type ($placementType) and direction ($placementDirection)', ({ state, sources, destination, placementType, placementDirection }) => {
        expect(() => placementDestinationLocations(state, sources, destination, placementType, placementDirection)).toThrow()
    })

})

describe.skip('select all samples from source, preview them on destination and then place', () => {
    let state = reducer(initialState, loadSamplesAndContainers({ parentContainers: [srcContainer, dstContainer] }))

    const placedOutCoords = srcContainer.containers.map((container) => container.coordinates)

    test('select all samples from source', () => {
        state = placedOutCoords.reduce((state, coordinates) => {
            return reducer(state, clickCell({
                parentContainer: srcContainer.name,
                coordinates,
                placementType: 'group',
                placementDirection: 'row'
            }))
        }, state)
        placedOutCoords.map((coordinates) => state.parentContainers[srcContainer.name]?.cells[coordinates]).forEach((cell) => {
            expect(cell?.selected).toEqual(true)
        })
        expect(state.activeSelections).toHaveLength(placedOutCoords.length)
        expect(state.error).toBeUndefined()
    })

    const placedInCoords = ['D01', 'D02', 'D03']

    const dstLocation: MouseOnCellPayload = {
        parentContainer: dstContainer.name,
        coordinates: 'D01',
        placementType: 'group',
        placementDirection: 'row'
    }
    test('place a sample in destination from source', () => {
        state = reducer(state, clickCell(dstLocation))

        placedOutCoords.map((coordinates) => state.parentContainers[dstContainer.name]?.cells[coordinates])

        expect(state.activeSelections).toHaveLength(0)
        expect(state.error).toBeUndefined()
    })
})