import { viewSetActions, listAndTableActions } from "../shared/actions"

export default {
    ...viewSetActions("datasets", null),
    ...listAndTableActions("datasets", null, null),
}