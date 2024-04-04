import { describe, expect, test } from '@jest/globals';
import reducer, { loadSamplesAndContainers, clickCell, initialState, PlacementState, PlacementContainerState, LoadSamplesAndContainersPayload, CellIdentifier, CellState, createEmptyCells, MouseOnCellPayload } from './reducers'
import { CoordinateSpec } from '../../models/fms_api_models';

test('initialize with 0 containers and samples', () => {
    expect(reducer(
        initialState,
        loadSamplesAndContainers({ parentContainers: [] })
    )).toEqual(initialState)
})

type LoadParentContainerPayload = LoadSamplesAndContainersPayload['parentContainers'][number]

const srcContainer: LoadParentContainerPayload = {
    name: 'Source Container',
    spec: [['A', 'B', 'C'], ['01', '02', '03']] as CoordinateSpec,
    containers: [{
        coordinate: 'A01',
        sample: 1
    }, {
        coordinate: 'B02',
        sample: 2
    }, {
        coordinate: 'C03',
        sample: 3
    }]
}

const dstContainer: LoadParentContainerPayload = {
    name: 'Destination Container',
    spec: [['A', 'B', 'C', 'D'], ['01', '02', '03', '04']] as CoordinateSpec,
    containers: [{
        coordinate: 'A01',
        sample: 1
    }, {
        coordinate: 'B02',
        sample: 2
    }, {
        coordinate: 'C03',
        sample: 3
    }, {
        coordinate: 'D04',
        sample: 4
    }]
}


function makeExpectedParentContainerState(parentContainer: LoadParentContainerPayload): PlacementState['parentContainers'] {
    const { name, spec, containers } = parentContainer
    return {
        [name]: {
            spec,
            cells: {
                ...createEmptyCells(spec),
                ...containers.reduce((cells: PlacementContainerState['cells'], c) => {
                    cells[c.coordinate] = { state: { status: 'none', sample: c.sample } }
                    return cells
                }, {})
            }
        }
    }
}

test('initialize with 2 containers containing more than one container', () => {
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

describe('select all samples from source, preview them on destination and then place', () => {
    let state = reducer(initialState, loadSamplesAndContainers({ parentContainers: [srcContainer, dstContainer] }))

    const placedOutCoords = srcContainer.containers.map((container) => container.coordinate)

    test('select all samples from source', () => {
        state = placedOutCoords.reduce((state, coordinate) => {
            return reducer(state, clickCell({
                parentContainer: srcContainer.name,
                coordinate
            }))
        }, state)
        expect(placedOutCoords.map((coordinate) => state.parentContainers[srcContainer.name]?.cells[coordinate]?.state)).toMatchObject({ status: 'selected' })
        expect(state.activeSelections).toHaveLength(3)
    })

    const placedInCoords = ['D01', 'D02', 'D03']

    const dstLocation: MouseOnCellPayload = {
        parentContainer: dstContainer.name,
        coordinate: 'D01',
        placementType: 'group',
        placementDirection: 'row'
    }
    test('place a sample in destination from source', () => {
        state = reducer(state, clickCell(dstLocation))

        placedOutCoords.map(())

        expect(state.activeSelections).toHaveLength(0)
    })
})