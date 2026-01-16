import { FMSUser } from "./models/fms_api_models"

export const PERMISSIONS = {
  LAUNCH_EXPERIMENT_RUN: "launch_experiment_run",
  RELAUNCH_EXPERIMENT_RUN: "relaunch_experiment_run",
} as const

export function hasPermission(user: FMSUser, permissionName: string) : boolean {
  if (!user)
    return false
  return user.permissions.filter(permission => permission.name===permissionName).length > 0
}
