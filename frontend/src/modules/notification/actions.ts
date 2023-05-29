import { AppDispatch, RootState } from "../../store"
import { ALERT_REMOVE, AlertAction, AlertID, AlertProps, AlertRemoveAction, ALERT } from "./models"

export const alert = (id: AlertID, props: AlertProps) => async (dispatch: AppDispatch, getState: () => RootState) => {
    if (id in getState().notifications) {
        return;
    }
    dispatch<AlertAction>({
        type: ALERT,
        id,
        props: props
    })
}

export const closeAlert = (id: AlertID) => async (dispatch: AppDispatch, getState: () => RootState) => {
    if (!(id in getState().notifications)) {
        return;
    }
    dispatch<AlertRemoveAction>({
        type: ALERT_REMOVE,
        id
    })
} 