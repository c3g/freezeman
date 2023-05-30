import React from "react"
import { AppDispatch, RootState } from "../../store"
import { ALERT_REMOVE, AlertAction, AlertID, AlertProps, AlertRemoveAction, ALERT, AlertType } from "./models"
import { notification } from "antd"

const hasAlert = (state: RootState, id: AlertID) => {
    return state.notifications.some((notification) => notification.id === id)
}

export const alert = (id: AlertID, props: AlertProps) => async (dispatch: AppDispatch, getState: () => RootState) => {
    if (hasAlert(getState(), id)) {
        return;
    }
    notification[props.type]({
        message: props.title,
        description: <pre style={{fontSize: '0.8em', whiteSpace: 'pre-wrap'}}>{props.description}</pre>,
        duration: props.duration,
        onClose: () => dispatch(closeAlert(id))
      });
    dispatch<AlertAction>({
        type: ALERT,
        id,
        props: props
    })
}

export const closeAlert = (id: AlertID) => async (dispatch: AppDispatch, getState: () => RootState) => {
    if (!hasAlert(getState(), id)) {
        return;
    }
    notification.close(id)
    dispatch<AlertRemoveAction>({
        type: ALERT_REMOVE,
        id
    })
}

export const showNotification = (
    title: AlertProps['title'],
    description: AlertProps['description'],
    type: AlertProps['type'] = AlertType.ERROR
) => {
    return alert(title, { type, title, description, duration: 0 })
}