import { ReactNode } from "react"
import { AnyAction } from "redux"

export const ALERT = 'ALERT'
export const ALERT_REMOVE = `${ALERT}.REMOVE`

export enum AlertType {
    SUCCESS = 'success',
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error'
}

export interface AlertProps {
    type: AlertType,
    description: ReactNode
    title?: string,
    error?: Error
}

export type AlertID = string

export interface AlertAction extends AnyAction {
    id: AlertID,
    props: AlertProps
}

export interface AlertRemoveAction extends AnyAction {
    id: AlertID
}

export type NotificationState = { [key: AlertID]: {
    description: ReactNode
    title?: string
    error?: Error
    type: AlertType
} }