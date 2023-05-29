import { Reducer } from "redux"
import { ALERT_REMOVE, AlertAction, AlertRemoveAction, ALERT, NotificationState } from "./models"
import {del, merge} from 'object-path-immutable'

export const notifications: Reducer<NotificationState, AlertAction | AlertRemoveAction> = (state, action) => {
    switch(action.type) {
        case ALERT: {
            const alertAction = action as AlertAction
            return merge<NotificationState>(state ?? {}, [alertAction.id], alertAction.props)
        }

        case ALERT_REMOVE: {
            const alertRemoveAction = action as AlertRemoveAction
            return del<NotificationState>(state ?? {}, [alertRemoveAction.id])
        }
    }

    return state ?? {}
}