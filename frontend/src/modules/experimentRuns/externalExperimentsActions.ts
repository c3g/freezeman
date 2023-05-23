import { selectExternalExperimentRunsState } from "../../selectors"
import api from "../../utils/api"
import { LIST_EXTERNAL_EXPERIMENTS } from "./externalExperimentsReducers"



export function loadExternalExperimentRuns() {
	return async (dispatch, getState) => {
		const state = selectExternalExperimentRunsState(getState())
		if(! state.isFetching) {
			dispatch({
				type: LIST_EXTERNAL_EXPERIMENTS.REQUEST
			})
			try {
				const options = {
					limit: 100000
				}	// no options yet
				const response = await dispatch(api.experimentRuns.listExternalRuns(options))
				dispatch({
					type: LIST_EXTERNAL_EXPERIMENTS.RECEIVE,
					data: response.data
				})
			} catch(error) {
				dispatch({
					type: LIST_EXTERNAL_EXPERIMENTS.ERROR,
					error
				})
			}
		}
	}
}