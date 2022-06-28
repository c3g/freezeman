import { viewSetActions, listAndTableActions } from "../shared/actions"

export default {
    ...viewSetActions("datasets", null, null),
    ...listAndTableActions("datasets", null, null, null),
}