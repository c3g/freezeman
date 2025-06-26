def is_test_migration(apps):
    Index = apps.get_model("fms_core", "Index")

    return not Index.objects.all().exists()