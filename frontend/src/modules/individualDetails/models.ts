import { FMSId } from "../../models/fms_api_models"
import { Individual, Sample } from "../../models/frontend_models"
import { PagedItemsByID } from "../../models/paged_items"

export interface IndividualDetails {
    individual: Individual,
    samplesByIndividual: PagedItemsByID<Sample>
}

export interface IndividualDetailsById {
    // key: FMSId for individual mapping individualDetails
    [key: FMSId]: Readonly<IndividualDetails>
}