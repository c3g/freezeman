<h1 align="center">
  FreezeMan
</h1>
<p align="center">
  <a href="https://codecov.io/gh/c3g/freezeman">
    <img src="https://codecov.io/gh/c3g/freezeman/branch/master/graph/badge.svg" />
  </a>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#license">License</a>
</p>

<p>
  <b>
    FreezeMan is a freezer management system designed to manage the storage and tracking of biological samples in a laboratory environment.
  </b>
</p>



## Installation

```bash
# Clone the repository
git clone https://github.com/c3g/freezeman
cd freezeman
# Use HTTPS for the git:// URL of the submodule (see "Submodule URL" below)
git config url."https://github.com/".insteadOf "git://github.com/"
git submodule update --init --recursive
```

### Submodule URL

The submodule `backend/dependencies/pg_fzy` has a `git://` URL in `.gitmodules`. GitHub does not
serve the `git://` protocol, so `git submodule update` can fail. The `git config` command above tells
git to use HTTPS for GitHub `git://` URLs in this checkout only. Run it after the clone and before
`git submodule update`. To apply the rule to all your checkouts, add `--global`:

```bash
git config --global url."https://github.com/".insteadOf "git://github.com/"
```

Next, follow the instructions in [/backend/](./backend/) and
[/frontend/](./frontend/).

## License

FreezeMan is licensed under the GNU LGPL version 3
&copy; [C3G, McGill University](http://www.computationalgenomics.ca/)

Portions copyright: Django Software Foundation and individual
contributors to the Django project. See relevant licenses:

  * `/backend/templates/admin/base_site.html`

Portions copyright: Bojan Mihelac and individual contributors to the 
`django-import-export` project.
