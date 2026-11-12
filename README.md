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
git submodule update --init --recursive
```

### Submodule URL

The submodule `backend/dependencies/pg_fzy` has a `git://` URL in `.gitmodules`. GitHub does not
serve the `git://` protocol, so `git submodule update` can fail. Before the submodule update, tell git
to use HTTPS for GitHub `git://` URLs:

```bash
git config --global url."https://github.com/".insteadOf "git://github.com/"
```

To apply the rule to this checkout only, run the command without `--global` in the checkout,
after the clone and before the submodule update:

```bash
git clone https://github.com/c3g/freezeman
cd freezeman
git config url."https://github.com/".insteadOf "git://github.com/"
git submodule update --init --recursive
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
