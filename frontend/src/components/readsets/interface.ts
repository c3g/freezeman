import { ReleaseStatus } from "../../models/fms_api_models"
import { Readset } from "../../models/frontend_models"

export interface ReleaseStatusOptionState {
    all: ReleaseStatus | undefined
    specific: Record<Readset['id'], ReleaseStatus | undefined>
}

export interface ReleaseStatusOptionActionAll {
    type: "all"
    releaseStatus: ReleaseStatus.RELEASED | ReleaseStatus.BLOCKED
}
export interface ReleaseStatusOptionActionToggle {
    type: "toggle"
    id: Readset['id']
    releaseStatus: ReleaseStatus.RELEASED | ReleaseStatus.BLOCKED
}
export interface ReleaseStatusOptionActionUndoAll {
    type: "undo-all"
}
export type ReleaseStatusOptionAction =
    | ReleaseStatusOptionActionAll
    | ReleaseStatusOptionActionToggle
    | ReleaseStatusOptionActionUndoAll