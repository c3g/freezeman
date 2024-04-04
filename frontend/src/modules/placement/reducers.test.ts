import { describe, expect, test } from '@jest/globals';
import reducer, { loadSamplesAndContainers, clickCell, initialState, PlacementState, PlacementContainerState, LoadSamplesAndContainersPayload, CellIdentifier, CellState, createEmptyCells } from './reducers'
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


test('initialize with 2 containers containing more than one container', () => {
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

describe('select a sample from source and place it in destination', () => {
    let state = reducer(initialState, loadSamplesAndContainers({ parentContainers: [srcContainer, dstContainer] }))

    const srcLocation: CellIdentifier = { parentContainer: srcContainer.name, coordinate: srcContainer.containers[0].coordinate }
    test('select a sample from source', () => {
        state = reducer(state, clickCell(srcLocation))
        expect(state.parentContainers[srcContainer.name]?.cells[srcLocation.coordinate]?.state.status).toEqual('selected')
        expect(state.activeSelections).toEqual([srcLocation])
    })

    const dstLocation: CellIdentifier = { parentContainer: dstContainer.name, coordinate: 'A04' }
    test('place a sample in destination from source', () => {
        state = reducer(state, clickCell(dstLocation))

        const srcCellState = state.parentContainers[srcContainer.name]?.cells[srcLocation.coordinate]?.state
        const dstCellState = state.parentContainers[dstContainer.name]?.cells[dstLocation.coordinate]?.state

        if (srcCellState && dstCellState) {
            expect(srcCellState).toEqual({
                status: 'placed-out',
                sample: srcContainer.containers[0].sample,
                toCell: dstLocation
            } as CellState['state'])

            expect(dstCellState).toEqual({
                status: 'placed-in',
                sample: null,
                fromCell: srcLocation
            } as CellState['state'])
        }

        expect(state.activeSelections).toHaveLength(0)
    })
})