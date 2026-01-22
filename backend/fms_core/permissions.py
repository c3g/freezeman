from rest_framework.permissions import BasePermission
from .models.freezeman_permission_by_user import FreezemanPermissionByUser


class LaunchExperimentRun(BasePermission):
    PERMISSION_NAME = "launch_experiment_run"
    def has_permission(self, request, view):
        permission_by_user = FreezemanPermissionByUser.objects.filter(freezeman_user__user=request.user.id, freezeman_permission__name=self.PERMISSION_NAME).first()
        
        return permission_by_user is not None

class RelaunchExperimentRun(BasePermission):
    PERMISSION_NAME = "relaunch_experiment_run"
    def has_permission(self, request, view):
        permission_by_user = FreezemanPermissionByUser.objects.filter(freezeman_user__user=request.user.id, freezeman_permission__name=self.PERMISSION_NAME).first()
        
        return permission_by_user is not None