import {stringify as qs} from "querystring";
import {API_BASE_PATH} from "../config";

const api = {
  auth: {
    token: credentials => post("/token/", credentials),
    tokenRefresh: tokens => post("/token/refresh/", tokens),
    resetPassword: email => post("/password_reset/", { email }),
    changePassword: (token, password) => post("/password_reset/confirm/", { token, password }),
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
    listChildrenRecursively: id => get(`/containers/${id}/list_children_recursively/`),
    summary: () => get("/containers/summary/"),
    template: {
      actions: () => get(`/containers/template_actions/`),
      check:  (action, template) => post(`/containers/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/containers/template_submit/`, form({ action, template })),
    },
    prefill: {
      templates: () => get(`/containers/list_prefills/`),
      request: (options, template) => get(`/containers/prefill_template/`, {template: template, ...options}),
    },
    search: (q, { parent, sample_holding, exact_match }) =>
      get("/containers/search/", { q, parent, sample_holding, exact_match }),
  },

  datasets: {
    get: id => get(`/datasets/${id}/`),
    list: (options, abort) => get("/datasets/", options, { abort }),
    setReleaseStatus: (id, release_status, exceptions = [], filters = {}) => patch(`/datasets/${id}/set_release_status/`, { release_status, exceptions, filters })
  },

  datasetFiles: {
    get: id => get(`/dataset-files/${id}/`),
    update: dataset => patch(`/dataset-files/${dataset.id}/`, dataset),
    list: (options, abort) => get("/dataset-files/", options, { abort }),
  },

  experimentRuns: {
    get: experimentRunId => get(`/experiment-runs/${experimentRunId}`),
    list: (options, abort) => get("/experiment-runs/", options, {abort}),
    listExport: options => get("/experiment-runs/list_export/", {format: "csv", ...options}),
    template: {
      actions: () => get(`/experiment-runs/template_actions/`),
      check:  (action, template) => post(`/experiment-runs/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/experiment-runs/template_submit/`, form({ action, template })),
    },
    launchRunProcessing: experimentRunId => patch(`/experiment-runs/${experimentRunId}/launch_run_processing/`, {}), 
    fetchRunInfo: experimentRunId => get(`/experiment-runs/${experimentRunId}/run_info`, {}),
  },

  runTypes: {
    list: () => get("/run-types/"),
  },

  importedFiles: {
    get: fileId => get(`/imported-files/${fileId}/`),
    list: (options, abort) => get("/imported-files/", options, { abort }),
    download: fileId => get(`/imported-files/${fileId}/download/`),
  },

  indices: {
    get: indexId => get(`/indices/${indexId}/`),
    list: (options, abort) => get("/indices", options, { abort }),
    listExport: options => get("/indices/list_export/", {format: "csv", ...options}),
    listSets: () => get("/indices/list_sets/"),
    summary: () => get("/indices/summary"),
    template: {
      actions: () => get(`/indices/template_actions/`),
      check:  (action, template) => post(`/indices/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/indices/template_submit/`, form({ action, template })),
    },
    validate: (options) => get("/indices/validate/", options),
  },

  individuals: {
    get: individualId => get(`/individuals/${individualId}/`),
    add: individual => post("/individuals/", individual),
    update: individual => patch(`/individuals/${individual.id}/`, individual),
    list: (options, abort) => get("/individuals/", options, { abort }),
    listExport: options => get("/individuals/list_export/", {format: "csv", ...options}),
    search: (q, options) => get("/individuals/search/", { q, ...options }),
  },

  instruments: {
    list: () => get("/instruments/"),
    listTypes: () => get("/instruments/list_types"),
  },


  libraries: {
    get: libraryId => get(`/libraries/${libraryId}/`),
    list: (options, abort) => get("/libraries", options, { abort }),
    listExport: options => get("/libraries/list_export/", {format: "csv", ...options}),
    summary: () => get("/libraries/summary/"),
    template: {
      actions: () => get(`/libraries/template_actions/`),
      check:  (action, template) => post(`/libraries/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/libraries/template_submit/`, form({ action, template })),
    },
    prefill: {
      templates: () => get(`/libraries/list_prefills/`),
      request: (options, template) => get(`/libraries/prefill_template/`, {template: template, ...options}),
    },
    search: q => get("/libraries/search/", { q }),
  },

  libraryTypes: {
    get: libraryTypeId => get(`/library-types/${libraryTypeId}/`),
    list: (options, abort) => get("/library-types/", options, { abort }),
  },

  platforms: {
    get: platformId => get(`/platforms/${platformId}/`),
    list: (options, abort) => get("/platforms/", options, { abort }),
  },

  pooledSamples: {
    list: (options, abort) => get("/pooled-samples/", options, { abort }),
    listExport: options => get("/pooled-samples/list_export/", {format: "csv", ...options}),
  },

  processes: {
    get: processId => get(`/processes/${processId}/`),
    list: (options, abort) => get("/processes/", options, { abort }),
  },

  processMeasurements: {
    get: processMeasurementId => get(`/process-measurements/${processMeasurementId}/`),
    list: (options, abort) => get("/process-measurements/", options, { abort }),
    listExport: options => get("/process-measurements/list_export/", {format: "csv", ...options}),
    search: q => get("/process-measurements/search/", { q }),
    summary: () => get("/process-measurements/summary/"),
    template: {
      actions: () => get(`/process-measurements/template_actions/`),
      check:  (action, template) => post(`/process-measurements/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/process-measurements/template_submit/`, form({ action, template })),
    },
  },

  projects: {
    get: projectId => get(`/projects/${projectId}/`),
    add: project => post("/projects/", project),
    update: project => patch(`/projects/${project.id}/`, project),
    list: (options, abort) => get("/projects", options, { abort }),
    listExport: options => get("/projects/list_export/", {format: "csv", ...options}),
    summary: () => get("/projects/summary"),
    template: {
      actions: () => get(`/projects/template_actions/`),
      check:  (action, template) => post(`/projects/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/projects/template_submit/`, form({ action, template })),
    },
  },

  propertyValues: {
    list: (options, abort) => get("/property-values/", options, { abort }),
  },

  protocols: {
    list:  (options, abort) => get("/protocols/", options, { abort }),
  },

  referenceGenomes: {
    get: referenceGenomeId => get(`/reference-genomes/${referenceGenomeId}`),
    list: (options, abort) => get('/reference-genomes/', options, { abort }),
    search: q => get("/reference-genomes/search/", { q }),
  },

  samples: {
    get: sampleId => get(`/samples/${sampleId}/`),
    add: sample => post("/samples/", sample),
    update: sample => patch(`/samples/${sample.id}/`, sample),
    list: (options, abort) => get("/samples", options, { abort }),
    listExport: options => get("/samples/list_export/", {format: "csv", ...options}),
    listExportMetadata: options => get("/samples/list_export_metadata/", {format: "csv", ...options}),
    listCollectionSites: () => get("/samples/list_collection_sites/"),
    listVersions: sampleId => get(`/samples/${sampleId}/versions/`),
    summary: () => get("/samples/summary/"),
    template: {
      actions: () => get(`/samples/template_actions/`),
      check:  (action, template) => post(`/samples/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/samples/template_submit/`, form({ action, template })),
    },
    prefill: {
      templates: () => get(`/samples/list_prefills/`),
      request: (options, template) => get(`/samples/prefill_template/`, {template: template, ...options}),
    },
    search: q => get("/samples/search/", { q }),
  },

  sampleMetadata: {
    get: options => get(`/sample-metadata/`, options),
    search: (q, options) => get("/sample-metadata/search/", { q, ...options }),
  },

  sampleKinds: {
    list: () => get("/sample-kinds/"),
  },

  sampleNextStep: {
    getStudySamples: (studyId) => get('/sample-next-step/', {study__id__in : studyId}),
    labworkSummary: () => get('/sample-next-step/labwork_info/')
  },

  sequences: {
    get: sequenceId => get(`/sequences/${sequenceId}/`),
    list: (options, abort) => get("/sequences/", options, { abort }),
  },

  studies: {
    get: studyId => get(`/studies/${studyId}/`),
    add: study => post("/studies/", study),
    update: study => patch(`/studies/${study.id}/`, study),
    listProjectStudies: projectId => get('/studies', { project__id: projectId})
  },

  taxons: {
    get: taxonId => get(`/taxons/${taxonId}/`),
    list: (options, abort) => get("/taxons/", options, { abort }),
    search: q => get("/taxons/search/", { q }),
  },

  users: {
    get: userId => get(`/users/${userId}/`),
    add: user => post("/users/", user),
    update: user => patch(`/users/${user.id}/`, user),
    updateSelf: user => patch(`/users/update_self/`, user),
    list: (options, abort) => get("/users", options, { abort }),
    listRevisions: (userId, options = {}) => get(`/revisions`, { user_id: userId, ...options }),
    listVersions: (userId, options = {}) => get(`/versions`, { revision__user: userId, ...options }),
  },

  workflows: {
    get: workflowId => get(`/workflows/${workflowId}`),
    list: (options, abort) => get('/workflows/', options, { abort })
  },

  groups: {
    list: (options, abort) => get("/groups", options, { abort }),
  },

  query: {
    search: q => get("/query/search/", { q }, { abort: true }),
  },

  sample_lineage: {
    get: sampleId => get(`/sample-lineage/${sampleId}/graph`)
  }
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
  const contentDispo = response.headers.get('content-disposition');
  const filename = getFilenameOrNull(contentDispo)
  if (filename)
    response.filename = filename

  /*
    TODO: This code was causing downloaded excel templates to become corrupted because
    the backend was sending "None" as a Content-Type, due to a problem with mime types.
    We tried to fix that by hard-coding the content-type as 'application/octet-stream' but
    the files were still corrupt.

    The problem was traced to this code. By default, the response is converted to text unless
    the content-type correctly identifies the file as an excel sheet.

    This was a difficult problem to figure out. This code needs to be improved to avoid
    the same problem in the future if we transer other binary data types.
  */
  const isJSON = contentType.includes('/json')
  const isExcel = contentType.includes('/ms-excel') || contentType.includes('/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  const isZip = contentType.includes('/zip')

  response.isJSON = isJSON
  return (isJSON ? response.json() : isExcel || isZip ? response.arrayBuffer() : response.text())
  .then(data => {
    response.data = data;
    return response;
  })
  .catch(() => {
    response.data = {};
    return response;
  })
}

function getFilenameOrNull(contentDispo){
  if(contentDispo)
    return contentDispo.split('filename=').length > 1
      ? contentDispo.split('filename=')[1].replace(/^.*[\\\/]/, '')
      : null
  else
    return null
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
