import { viewSetActions, listAndTableActions } from "../shared/actions"

export default {
    ...viewSetActions("datasets", "datasets", null),
    ...listAndTableActions("datasets", "datasets", null, null),
}