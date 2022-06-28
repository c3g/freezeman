import { viewSetRedux, listAndTableRedux } from "../shared/redux"

export * from {
    ...viewSetRedux("datasets", "datasets", "datasets").actions,
    ...listAndTableRedux("datasets", "datasets", "datasets", {}).actions,
}