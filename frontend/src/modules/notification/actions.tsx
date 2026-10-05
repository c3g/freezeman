import React from "react"
import { notification } from "antd"

export const INFINITE_DURATION = 0

type NotificationID = string

export interface NotifyProps {
    id: NotificationID
    type: keyof Pick<typeof notification, 'success' | 'info' | 'warning' | 'error'>
    title: string
    description?: string
    duration?: number
}

const notifications = new Map<string, NotifyProps>()

export const notify = (props: NotifyProps) => {
    const { id } = props

    if (notifications.has(id)) {
        closeNotification(id)
    }

    notification[props.type]({
        message: props.title,
        description: props.description ? <pre style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap' }}>{props.description}</pre> : undefined,
        duration: props.duration,
        key: id,
        onClose: () => closeNotification(id)
    });

    notifications.set(id, props)

    return { type: "POTATO" }
}

export const closeNotification = (id: NotificationID) => {
    if (!notifications.has(id)) {
        return { type: "POTATO" }
    }

    // notification has onClose config which dispatches closeNotification.
    // Closing after dispatch should prevent duplicate remove action.
    notification.destroy(id)

    return { type: "POTATO" }
}

const withNotificationType = (type: NotifyProps['type']) => (props: Omit<NotifyProps, 'type'>) => notify({...props, type})

export const notifySuccess = withNotificationType('success')
export const notifyInfo = withNotificationType('info')
export const notifyWarning = withNotificationType('warning')
export const notifyError = withNotificationType('error')
