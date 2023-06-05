import { AnyAction } from "redux"

export const NOTIFICATION = 'NOTIFICATION'
export const NOTIFICATION_REMOVE = `${NOTIFICATION}.REMOVE`

export enum NotificationType {
    SUCCESS = 'SUCCESS',
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
}

export type NotificationInputType = string | number | boolean | null | undefined
export interface NotificationProps {
    type: NotificationType
    description: NotificationInputType
    title: NotificationInputType
    duration?: number
}

export type NotificationID = string

export interface NotificationAction extends AnyAction {
    id: NotificationID,
    props: NotificationProps
}

export interface NotificationRemoveAction extends AnyAction {
    id: NotificationID
}

export interface NotificationItem extends NotificationProps {
    id: NotificationID
}