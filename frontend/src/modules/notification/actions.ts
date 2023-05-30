import { AppDispatch, RootState } from "../../store"
import { ALERT_REMOVE, AlertAction, AlertID, AlertProps, AlertRemoveAction, ALERT } from "./models"

const hasAlert = (state: RootState, id: AlertID) => {
    return state.notifications.some((notification) => notification.id === id)
}

export const alert = (id: AlertID, props: AlertProps) => async (dispatch: AppDispatch, getState: () => RootState) => {
    if (hasAlert(getState(), id)) {
        return;
    }
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
    dispatch<AlertRemoveAction>({
        type: ALERT_REMOVE,
        id
    })
} 