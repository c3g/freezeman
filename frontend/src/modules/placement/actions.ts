import { FMSContainer, FMSId, LabworkStepInfo } from '../../models/fms_api_models';
import { selectContainerKindsByID } from '../../selectors';
import store, { AppDispatch, RootState } from '../../store';
import api from '../../utils/api';
import { LoadContainersPayload, loadContainers as reduceLoadContainers } from './reducers';

export function loadContainers(stepID: FMSId, sampleIDs: FMSId[]) {
    return async (dispatch: AppDispatch, getState: () => RootState) => {
        const containerKinds = selectContainerKindsByID(getState())
        const values: LabworkStepInfo = (await store.dispatch(api.sampleNextStep.labworkStepSummary(stepID, "ordering_container_name", { sample__id__in: sampleIDs.join(',') }))).data
        const containers = values.results.samples.groups
        const payload: LoadContainersPayload = await Promise.all(containers.map(async (containerGroup) => {
            // Handles containers like tubes_without_parent_container. It assumes there isn't a container named like that.
            // TODO: actually handle tubes_without_parent_container containers
            const [containerDetail] = await store.dispatch(api.containers.list({ name: containerGroup.name })).then(container => container.data.results as ([FMSContainer] | []))
            if (containerDetail) {
                const spec = containerKinds[containerDetail.kind].coordinate_spec
                return {
                    name: containerDetail.name,
                    barcode: containerDetail.barcode,
                    kind: containerDetail.kind,
                    spec,
                    containers: containerGroup.sample_locators.map((locator) => {
                        return {
                            sample: locator.sample_id,
                            coordinates: locator.contextual_coordinates
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
                            coordinates: locator.contextual_coordinates
                        }
                    })
                }
            }
        }))
        dispatch(reduceLoadContainers(payload))

        return Object.keys(getState().placement.parentContainers)
    }
}
