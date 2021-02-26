<h1 align="center">
  FreezeMan
</h1>
<p align="center">
  <b>
    FreezeMan is a freezer management system designed to manage the storage and tracking of biological samples in a laboratory environment.
  </b>
</p>

<!-- ![Travis Build Status](https://api.travis-ci.com/c3g/freezeman_server.svg?branch=master) -->
[![codecov](https://codecov.io/gh/c3g/freezeman/branch/master/graph/badge.svg)](https://codecov.io/gh/c3g/freezeman)

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#license">License</a>
</p>



## Installation

```bash
# Clone the repository
git clone https://github.com/c3g/freezeman
cd freezeman
git submodule update --init --recursive
```

Next, follow the instructios in [/backend/README.md](./backend/README.md) and
[/frontend/README.md](./frontend/README.md).

## License

Copyright &copy; the 
[CCCG](http://www.computationalgenomics.ca/), 
McGill University 2020. All rights reserved. FreezeMan is licensed under the 
GNU Lesser General Public License version 3.

Portions copyright &copy; Django Software Foundation and individual
contributors to the Django project.

See relevant license in the following files:

  * `/backend/templates/admin/base_site.html`

Portions copyright &copy; Bojan Mihelac and individual contributors to the 
`django-import-export` project.

See relevant license in the following files:

  * `/backend/fms_core/templates/admin/fms_core/change_list_export_version.html`
  * `/backend/fms_core/templates/admin/fms_core/change_list_import_export_version.html`
  * `/backend/fms_core/templates/admin/fms_core/download_import.html`

