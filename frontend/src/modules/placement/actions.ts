import { FMSContainer, FMSId, LabworkStepInfo } from '../../models/fms_api_models';
import { selectContainerKindsByID } from '../../selectors';
import store, { AppDispatch, RootState } from '../../store';
import api from '../../utils/api';
import { LoadSamplesAndContainersPayload, loadSamplesAndContainers as reduceLoadSamplesAndContainers, clickCell as reduceClickCell } from './reducers';

export const TUBES_WITHOUT_PARENT = "tubes_without_parent_container"

export function loadSamplesAndContainers(stepID: FMSId, sampleIDs: FMSId[]) {
    return async (dispatch: AppDispatch, getState: () => RootState) => {
        const containerKinds = selectContainerKindsByID(getState())
        const values: LabworkStepInfo = (await store.dispatch(api.sampleNextStep.labworkStepSummary(stepID, "ordering_container_name", { sample__id__in: sampleIDs.join(',') }))).data
        const containers = values.results.samples.groups
        const payload: LoadSamplesAndContainersPayload = {
            parentContainers: await Promise.all(containers.filter((containerGroup) => containerGroup.name !== TUBES_WITHOUT_PARENT).map(async (containerGroup) => {
                    const containerDetail: FMSContainer = await store.dispatch(api.containers.list({ name: containerGroup.name })).then(container => container.data.results[0])
                    const spec = containerKinds[containerDetail.kind].coordinate_spec
                    return {
                            name: containerDetail.name,
                            spec,
                            containers: containerGroup.sample_locators.map((locator) => {
                            const coordinate = locator.contextual_coordinates
                            return {
                                sample: locator.sample_id,
                                row: (spec[0]?.findIndex((s) => coordinate.startsWith(s)) ?? 0) + 1,
                                column: (spec[1]?.findIndex((s) => coordinate.endsWith(s)) ?? 0) + 1,
                            }
                        })
                    }
            }))
        }
        dispatch(reduceLoadSamplesAndContainers(payload))

        return Object.keys(getState().placement.parentContainers)
    }
}

export function clickCell(parentContainerName: string, row: number, column: number) {
    return (dispatch: AppDispatch, getState: () => RootState) => {
        dispatch(reduceClickCell({ parentContainer: parentContainerName, row, column }))
        return getState().placement.parentContainers[parentContainerName]?.cells[row][column].state.status
    }
}
