import { Reducer } from "redux"
import { ALERT_REMOVE, AlertAction, AlertRemoveAction, ALERT, NotificationState } from "./models"

export const notifications: Reducer<NotificationState[], AlertAction | AlertRemoveAction> = (oldState, action) => {
    const state = oldState ?? []
    switch(action.type) {
        case ALERT: {
            const alertAction = action as AlertAction
            return [
                ...state,
                {
                    ...alertAction.props,
                    id: alertAction.id,
                }
            ]
        }

        case ALERT_REMOVE: {
            const alertRemoveAction = action as AlertRemoveAction
            return state.filter((notification) => notification.id !== alertRemoveAction.id)
        }
    }

    return state
}