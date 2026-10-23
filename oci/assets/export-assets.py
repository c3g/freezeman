#!/usr/bin/env python
import os
import shutil

# Copy the built frontend and the Django static files out of the assets image into
# bind mounts that the host nginx serves (compose.yaml, service "assets").
# The target is emptied first, so files of a previous release do not stay.
for src, dst in (("/srv/fms/html", "/out/dist"), ("/srv/fms/static", "/out/static")):
    # Empty the target, not remove it: it is a bind mount.
    for entry in os.scandir(dst):
        if entry.is_dir(follow_symlinks=False):
            shutil.rmtree(entry.path)
        else:
            os.remove(entry.path)
    _ = shutil.copytree(src, dst, symlinks=True, dirs_exist_ok=True)
    count = sum(len(files) for _, _, files in os.walk(dst))
    print(f"{dst}: {count} files")
