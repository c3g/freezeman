import { FMSContainer, FMSId, LabworkStepInfo } from '../../models/fms_api_models';
import { selectContainerKindsByID } from '../../selectors';
import store, { AppDispatch, RootState } from '../../store';
import api from '../../utils/api';
import { LoadSamplesAndContainersPayload, loadSamplesAndContainers as reduceLoadSamplesAndContainers, clickCell as reduceClickCell } from './reducers';

export function loadSamplesAndContainers(stepID: FMSId, sampleIDs: FMSId[]) {
    return async (dispatch: AppDispatch, getState: () => RootState) => {
        const containerKinds = selectContainerKindsByID(getState())
        const values: LabworkStepInfo = (await store.dispatch(api.sampleNextStep.labworkStepSummary(stepID, "ordering_container_name", { sample__id__in: sampleIDs.join(',') }))).data
        const containers = values.results.samples.groups
        const payload: LoadSamplesAndContainersPayload = {
            parentContainers: await Promise.all(containers.map(async (containerGroup) => {
                    // Handle containers like tubes_without_parent_container. It assumes there isn't a container named like that.
                    const [containerDetail] = await store.dispatch(api.containers.list({ name: containerGroup.name })).then(container => container.data.results as ([FMSContainer] | []))
                    if (containerDetail) {
                        const spec = containerKinds[containerDetail.kind].coordinate_spec
                        return {
                            name: containerDetail.name,
                            spec,
                            containers: containerGroup.sample_locators.map((locator) => {
                                return {
                                    sample: locator.sample_id,
                                    coordinate: locator.contextual_coordinates
                                }
                            })
                        }
                    } else {
                        return {
                            name: containerGroup.name,
                            spec: [],
                            containers: containerGroup.sample_locators.map((locator) => {
                                return {
                                    sample: locator.sample_id,
                                    coordinate: locator.contextual_coordinates
                                }
                            })
                        }
                    }
            }))
        }
        dispatch(reduceLoadSamplesAndContainers(payload))

        return Object.keys(getState().placement.parentContainers)
    }
}

export function clickCell(parentContainerName: string, coordinate: string) {
    return (dispatch: AppDispatch, getState: () => RootState) => {
        dispatch(reduceClickCell({ parentContainer: parentContainerName, coordinate }))
        return getState().placement.parentContainers[parentContainerName]?.cells[coordinate].state
    }
}
