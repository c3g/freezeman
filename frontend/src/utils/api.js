import cheerio from "cheerio";
import {stringify as qs} from "querystring";
import {map} from "rambda";

import {API_BASE_PATH} from "../config";

const api = {
  auth: {
    token: credentials => post("/token/", credentials),
    tokenRefresh: tokens => post("/token/refresh/", tokens),
  },

  containerKinds: {
    list: () => get("/container-kinds/"),
  },

  containers: {
    get: id => get(`/containers/${id}/`),
    add: container => post("/containers/", container),
    update: container => patch(`/containers/${container.id}/`, container),
    list: (options, abort) => get("/containers", options, { abort }),
    listExport: options => get("/containers/list_export/", {format: "csv", ...options}),
    listParents: id => get(`/containers/${id}/list_parents/`),
    listChildren: id => get(`/containers/${id}/list_children/`),
    listSamples: id => get(`/containers/${id}/list_samples/`),
    summary: () => get("/containers/summary/"),
    template: {
      actions: () => get(`/containers/template_actions/`),
      check:  (action, template) => post(`/containers/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/containers/template_submit/`, form({ action, template })),
    },
    search: (q, { parent, sample_holding }) =>
      get("/containers/search/", { q, parent, sample_holding }),
  },

  individuals: {
    get: individualId => get(`/individuals/${individualId}/`),
    add: individual => post("/individuals/", individual),
    update: individual => patch(`/individuals/${individual.id}/`, individual),
    list: (options, abort) => get("/individuals/", options, { abort }),
    listExport: options => get("/individuals/list_export/", {format: "csv", ...options}),
    search: q => get("/individuals/search/", { q }),
  },

  samples: {
    get: sampleId => get(`/samples/${sampleId}/`),
    add: sample => post("/samples/", sample),
    update: sample => patch(`/samples/${sample.id}/`, sample),
    list: (options, abort) => get("/samples", options, { abort }),
    listExport: options => get("/samples/list_export/", {format: "csv", ...options}),
    listCollectionSites: () => get("/samples/list_collection_sites/"),
    listVersions: sampleId => get(`/samples/${sampleId}/versions/`),
    summary: () => get("/samples/summary/"),
    template: {
      actions: () => get(`/samples/template_actions/`),
      check:  (action, template) => post(`/samples/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/samples/template_submit/`, form({ action, template })),
    },
    search: q => get("/samples/search/", { q }),
  },

  sampleKinds: {
    list: () => get("/sample-kinds/"),
  },

  users: {
    get: userId => get(`/users/${userId}/`),
    add: user => post("/users/", user),
    update: user => patch(`/users/${user.id}/`, user),
    updateSelf: user => patch(`/users/update_self/`, user),
    list: (options, abort) => get("/users", options, { abort }),
    listVersions: userId => get(`/versions?revision__user=${userId}&limit=999999`), // TODO: handle versions?
  },

  groups: {
    list: (options, abort) => get("/groups", options, { abort }),
  },

  query: {
    search: q => get("/query/search/", { q }, { abort: true }),
  },
};


export default api;

export function withToken(token, fn) {
  return (...args) => fn(...args)(undefined, () => ({ auth: { tokens: { access: token } } }))
}

const ongoingRequests = {}

function apiFetch(method, route, body, options = { abort: false }) {
  const baseRoute = getPathname(route)

  return (_, getState) => {

    const accessToken = getState().auth.tokens.access;

    const headers = {}

    if (accessToken)
      headers["authorization"] = `Bearer ${accessToken}`

    if (!isFormData(body) && isObject(body))
      headers["content-type"] = "application/json"

    // For abortable requests
    let signal
    if (options.abort) {
      const controller = new AbortController()
      signal = controller.signal
      if (ongoingRequests[baseRoute]) {
        ongoingRequests[baseRoute].abort()
      }
      ongoingRequests[baseRoute] = controller
    }

    const request = fetch(`${API_BASE_PATH}${route}`, {
      method,
      headers,
      credentials: 'omit',
      signal,
      body:
        isFormData(body) ?
          body :
        isObject(body) ?
          JSON.stringify(body) :
          undefined,
    })

    return request.then(res => {
      if (options.abort) {
        delete ongoingRequests[baseRoute]
      }
      return res
    })
    .then(attachData)
    .then(response => {
      if (response.ok) {
        return response;
      }
      return Promise.reject(createAPIError(response));
    })
  };
}

function get(route, queryParams, options) {
  const fullRoute = route + (queryParams ? '?' + qs(queryParams) : '')
  return apiFetch('GET', fullRoute, undefined, options);
}

function post(route, body, options) {
  return apiFetch('POST', route, body, options);
}

function patch(route, body, options) {
  return apiFetch('PATCH', route, body, options);
}


function createAPIError(response) {
  let data = response.data;
  let detail;

  // Server errors
  if (response.isJSON && response.status === 400) {
    detail = JSON.stringify(data, null, 2)
  }
  else {
    // API error as { ok: false, detail: ... }
    try {
      detail = data.detail ||
        (data.revision__user && ('User: ' + data.revision__user.join(', ')));
    } catch (_) {}
  }

  const message = detail ?
    ('API error: ' + detail) :
    (`HTTP error ${response.status}: ` + response.statusText + ': ' + response.url)

  const error = new Error(message);
  error.name = 'APIError';
  error.fromAPI = Boolean(detail);
  error.data = data || {};
  error.url = response.url;
  error.status = response.status;
  error.statusText = response.statusText;
  error.stack = []

  return error;
}

function attachData(response) {
  const contentType = response.headers.get('content-type') || '' ;
  const isJSON = contentType.includes('/json')
  response.isJSON = isJSON
  return (isJSON ? response.json() : response.text())
  .then(data => {
    response.data = data;
    return response;
  })
  .catch(() => {
    response.data = {};
    return response;
  })
}

function form(params) {
  const formData = new FormData()
  for (let key in params) {
    const value = params[key]
    formData.append(key, value)
  }
  return formData
}

function isObject(object) {
  return object !== null && typeof object === 'object'
}

function isFormData(object) {
  return object instanceof FormData
}

function getPathname(route) {
  return route.replace(/\?.*$/, '')
}
