import { Reducer } from "redux"
import { NOTIFICATION_REMOVE, NotificationAction, NotificationRemoveAction, NOTIFICATION, NotificationItem } from "./models"

type AnyNotificationAction = NotificationAction | NotificationRemoveAction

export const notifications: Reducer<NotificationItem[], AnyNotificationAction> = (oldState, action) => {
    const state = oldState ?? []

    switch (action.type) {
        case NOTIFICATION: {
            const { props, id } = action as NotificationAction
            return [
                ...state,
                {
                    ...props,
                    id,
                }
            ]
        }
        case NOTIFICATION_REMOVE: {
            const { id } = action as NotificationRemoveAction
            return state.filter((notification) => notification.id !== id)
        }
    }

    return state
}