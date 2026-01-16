import { AppDispatch } from "../store";
import api from '../utils/api'

export async function userHasPermissionForAction(dispatch: AppDispatch, permissionName: string, userID: number) {
  const hasPermission = await dispatch(api.permissionsByUser.list({ freezeman_permission__name: permissionName, freezeman_user__user__id: userID }))
    .then(response => response.data.count > 0)

  return hasPermission
}