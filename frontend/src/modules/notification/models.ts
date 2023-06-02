import { ReactNode } from "react"
import { AnyAction } from "redux"

export const NOTIFICATION = 'NOTIFICATION'
export const NOTIFICATION_REMOVE = `${NOTIFICATION}.REMOVE`

export enum NotificationType {
    SUCCESS = 'SUCCESS',
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
}

export type SerializableReactNode = string | number | boolean | null | undefined
export interface NotificationProps {
    type: NotificationType
    description: SerializableReactNode
    title: SerializableReactNode
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