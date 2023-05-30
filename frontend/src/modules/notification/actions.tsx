import React from "react"
import { AppDispatch, RootState } from "../../store"
import { NOTIFICATION_REMOVE, NotificationAction as NotificationAction, NotificationID, NotificationProps, NotificationRemoveAction as NotificationRemoveAction, NOTIFICATION, NotificationType } from "./models"
import { notification } from "antd"

type AntdNotificationType = keyof Pick<typeof notification, 'success' | 'info' | 'warning' | 'error'>
const convertToAntdNotificationType: { [key in NotificationType]: AntdNotificationType } = {
    [NotificationType.SUCCESS]: 'success',
    [NotificationType.INFO]: 'info',
    [NotificationType.WARNING]: 'warning',
    [NotificationType.ERROR]: 'error'
}

const hasNotification = (state: RootState, id: NotificationID) => {
    return state.notifications.some((notification) => notification.id === id)
}

export const notify = (id: NotificationID, props: NotificationProps) => async (dispatch: AppDispatch, getState: () => RootState) => {
    if (hasNotification(getState(), id)) {
        return;
    }

    notification[convertToAntdNotificationType[props.type]]({
        message: props.title,
        description: <pre style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap' }}>{props.description}</pre>,
        duration: props.duration,
        onClose: () => dispatch(closeNotification(id))
    });

    dispatch<NotificationAction>({
        type: NOTIFICATION,
        id,
        props: props
    })
}

export const closeNotification = (id: NotificationID) => async (dispatch: AppDispatch, getState: () => RootState) => {
    if (!hasNotification(getState(), id)) {
        return;
    }
    notification.close(id)
    dispatch<NotificationRemoveAction>({
        type: NOTIFICATION_REMOVE,
        id
    })
}

export const showNotification = (
    titleAndID: NotificationProps['title'] & NotificationID,
    description: NotificationProps['description'],
    type: NotificationProps['type'] = NotificationType.ERROR
) => {
    return notify(titleAndID, { type, title: titleAndID, description, duration: 0 })
}