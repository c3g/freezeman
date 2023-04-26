import { FMSId, FMSPagedResultsReponse, FMSSampleNextStep } from "../../models/fms_api_models"
import api, { withToken } from "../../utils/api"
import { CoordinateSortDirection } from "./models"

// Default sorting keys for a prefilled template. By default, the lab wants samples grouped
// by plate and sorted by coordinate.
 
export function getCoordinateOrderingParams(direction: CoordinateSortDirection) {
	const ordering = direction === 'column' ? 
				'sample__container__barcode,sample__coordinate__column,sample__coordinate__row' : 
				'sample__container__barcode,sample__coordinate__row,sample__coordinate__column'
	return ordering
}

/**
 * Refresh the list of selected samples in a labwork step.
 * 
 * Samples may change workflow step at any time, as other users in the lab could be changing samples in the workflow.
 * 
 * This function sends the list of selected samples to the backend, and the backend returns whichever samples
 * are still at the expected step. If any samples have changed step (or have been removed from a study) then
 * they will be removed from the list.
 * 
 * The samples are returned in sorted order.
 * 
 * @param token 
 * @param stepID 
 * @param sampleIDs 
 * @returns 
 */
export async function refreshSelectedSamplesAtStep(token: string, stepID: FMSId, sampleIDs: FMSId[], direction: CoordinateSortDirection) {
	if (sampleIDs.length > 0) {
		try {
			// Sort by container, then by column/row, or by row/column depending on the sort direction.
 			const options = {
				sample__id__in: sampleIDs.join(','),
				limit: sampleIDs.length,
				ordering: getCoordinateOrderingParams(direction)
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
