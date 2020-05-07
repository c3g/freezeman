from django.contrib import admin
from django.contrib.admin import apps as admin_apps

from .info import (
    COMMIT_DATE,
    COMMIT_FULL_HASH,
    COMMIT_SMALL_HASH,
    COMMIT_TAGGED_VERSION,
    COPYRIGHT_YEARS,
    REPOSITORY,
    VERSION,
)


class AdminConfig(admin_apps.AdminConfig):
    default_site = "fms.admin.AdminSite"


class AdminSite(admin.AdminSite):
    def each_context(self, request):
        context = super().each_context(request)
        context.update({
            "fm_commit_date": COMMIT_DATE,
            "fm_commit_hash_full": COMMIT_FULL_HASH,
            "fm_commit_hash_small": COMMIT_SMALL_HASH,
            "fm_commit_tagged_version": COMMIT_TAGGED_VERSION,
            "fm_copyright_years": COPYRIGHT_YEARS,
            "fm_repository": REPOSITORY,
            "fm_version": VERSION,
        })
        return context
