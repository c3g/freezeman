import { FMSId, FMSPagedResultsReponse, FMSSampleNextStep } from "../../models/fms_api_models"
import api, { withToken } from "../../utils/api"

export async function refreshSelectedSamplesAtStep(token: string, stepID: FMSId, sampleIDs: FMSId[]) {
	if (sampleIDs.length > 0) {
		try {
			const options = {
				sample__id__in: sampleIDs.join(','),
				limit: sampleIDs.length
			}
			const reply = await withToken(token, api.sampleNextStep.listSamplesAtStep)(stepID, options)
			const response : FMSPagedResultsReponse<FMSSampleNextStep> = reply.data
			if (response.count > 0) {
				const refreshSampleIDs = response.results.map(nextStep => nextStep.sample)
				return refreshSampleIDs
			} 
		} catch(err) {
			console.error(`Error refreshing selected samples at step ${stepID}`, err)
		}
	}
	
	return []
}