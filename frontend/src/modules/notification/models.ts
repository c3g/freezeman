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
    type: AlertType
    description: ReactNode
    title: string
    duration?: number
}

export type AlertID = string

export interface AlertAction extends AnyAction {
    id: AlertID,
    props: AlertProps
}

export interface AlertRemoveAction extends AnyAction {
    id: AlertID
}

export interface NotificationState extends AlertProps {
    id: AlertID
}