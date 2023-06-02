import React from "react"
import { AppDispatch, RootState } from "../../store"
import { NOTIFICATION_REMOVE, NotificationAction as NotificationAction, NotificationID, NotificationProps, NotificationRemoveAction as NotificationRemoveAction, NOTIFICATION, NotificationType } from "./models"
import { notification } from "antd"

type AntdNotificationAPI = keyof Pick<typeof notification, 'success' | 'info' | 'warning' | 'error'>

// converts our NotificationType to the function names in the Antd Notification API
const convertToAntdNotificationAPI: { [key in NotificationType]: AntdNotificationAPI } = {
    [NotificationType.SUCCESS]: 'success',
    [NotificationType.INFO]: 'info',
    [NotificationType.WARNING]: 'warning',
    [NotificationType.ERROR]: 'error'
}

const hasNotification = (state: RootState, id: NotificationID) => {
    return state.notifications.some((notification) => notification.id === id)
}

export interface NotifyProps extends NotificationProps {
    id: NotificationID
}
export const notify = (props: NotifyProps) => (dispatch: AppDispatch, getState: () => RootState) => {
    const { id } = props

    if (hasNotification(getState(), id)) {
        dispatch(closeNotification(id))
    }

    notification[convertToAntdNotificationAPI[props.type]]({
        message: props.title,
        description: <pre style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap' }}>{props.description}</pre>,
        duration: props.duration,
        key: id,
        onClose: () => dispatch(closeNotification(id))
    });

    dispatch<NotificationAction>({
        type: NOTIFICATION,
        id,
        props: props
    })
}

export const closeNotification = (id: NotificationID) => (dispatch: AppDispatch, getState: () => RootState) => {
    if (!hasNotification(getState(), id)) {
        return;
    }
    dispatch<NotificationRemoveAction>({
        type: NOTIFICATION_REMOVE,
        id
    })

    // notification has onClose config which dispatches closeNotification.
    // Closing after dispatch should prevent duplicate remove action.
    notification.close(id)
}

const withType = (type: NotificationProps['type']) => (props: Omit<NotifyProps, 'type'>) => notify({...props, type})

export const notifySuccess = withType(NotificationType.SUCCESS)
export const notifyInfo = withType(NotificationType.INFO)
export const notifyWarning = withType(NotificationType.WARNING)
export const notifyError = withType(NotificationType.ERROR)
