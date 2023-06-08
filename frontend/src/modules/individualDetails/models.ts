import { FMSId, FMSSample } from "../../models/fms_api_models"
import { Individual } from "../../models/frontend_models"
import { PagedItems } from "../../models/paged_items"

export interface IndividualDetails {
    individual: Individual,
    samplesByIndividual: PagedItems<FMSSample>
}

export interface IndividualDetailsById {
    // key: FMSId for individual mapping individualDetails
    [key: FMSId]: Readonly<IndividualDetails>
}