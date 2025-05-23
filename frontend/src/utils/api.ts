import {stringify as qs} from "querystring";
import {API_BASE_PATH} from "../config";
import { FMSDataset, FMSId, FMSPagedResultsReponse, FMSProject, FMSProtocol, FMSReadset, FMSSample, FMSSampleNextStep, FMSSampleNextStepByStudy, FMSStep, FMSStepHistory, FMSStudy, FMSWorkflow, LabworkStepInfo, ReleaseStatus, FMSReportInformation, WorkflowStepOrder, FMSReportData, FMSPooledSample } from "../models/fms_api_models";
import { AnyAction, Dispatch } from "redux";
import { RootState } from "../store";

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
    list: (options, abort?: boolean) => get("/containers/", options, { abort }),
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
      request: (options, template) => filteredpost(`/containers/prefill_template/`, {...options}, form({ template: template })),
    },
    search: (q, { parent, sample_holding, exact_match, except_kinds }) =>
      get("/containers/search/", { q, parent, sample_holding, exact_match, except_kinds }),
  },

  coordinates: {
    get: coordinateId => get(`/coordinates/${coordinateId}/`),
    list: (options, abort?: boolean) => get("/coordinates/", options, { abort }),
    search: (q, options) => get("/coordinates/search/", { q, ...options }),
  },

  datasets: {
    get: (id: FMSDataset["id"]) => get<JsonResponse<FMSDataset>>(`/datasets/${id}/`),
    list: (options, abort?: boolean) => get<JsonResponse<FMSPagedResultsReponse<FMSDataset>>>("/datasets/", options, { abort }),
    setReleaseStatus: (
      id: FMSDataset["id"],
      updates: Record<FMSReadset["id"], ReleaseStatus>,
    ) => patch<StringResponse>(`/datasets/${id}/set_release_status/`, updates),
    addArchivedComment: (id, comment) => post(`/datasets/${id}/add_archived_comment/`, { comment })
  },

  readsets: {
    get: id => get(`/readsets/${id}/`),
    list: (options: QueryParams, abort?: boolean) => get<JsonResponse<FMSPagedResultsReponse<FMSReadset>>>(`/readsets/`, options, { abort }),
  },

  datasetFiles: {
    get: id => get(`/dataset-files/${id}/`),
    update: dataset => patch(`/dataset-files/${dataset.id}/`, dataset),
    list: (options, abort?: boolean) => get("/dataset-files/", options, { abort }),
  },

  experimentRuns: {
    get: experimentRunId => get(`/experiment-runs/${experimentRunId}/`),
    list: (options, abort?: boolean) => get("/experiment-runs/", options, {abort}),
    listExport: options => get("/experiment-runs/list_export/", {format: "csv", ...options}),
    template: {
      actions: () => get(`/experiment-runs/template_actions/`),
      check:  (action, template) => post(`/experiment-runs/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/experiment-runs/template_submit/`, form({ action, template })),
    },
    launchRunProcessing: experimentRunId => patch(`/experiment-runs/${experimentRunId}/launch_run_processing/`, {}),
    fetchRunInfo: experimentRunId => get(`/experiment-runs/${experimentRunId}/run_info/`, {}),
    setLaneValidationStatus: (experimentRunId, lane, validation_status) => post(`/experiment-runs/${experimentRunId}/set_experiment_run_lane_validation_status/`, {lane, validation_status}),
    getLaneValidationStatus: (experimentRunId, lane) => get(`/experiment-runs/${experimentRunId}/get_experiment_run_lane_validation_status/`, {lane})
  },

  runTypes: {
    list: () => get("/run-types/"),
  },

  importedFiles: {
    get: fileId => get(`/imported-files/${fileId}/`),
    list: (options, abort?: boolean) => get("/imported-files/", options, { abort }),
    download: fileId => get(`/imported-files/${fileId}/download/`),
  },

  indices: {
    get: indexId => get(`/indices/${indexId}/`),
    list: (options, abort?: boolean) => get("/indices/", options, { abort }),
    listExport: options => get("/indices/list_export/", {format: "csv", ...options}),
    listSets: () => get("/indices/list_sets/"),
    summary: () => get("/indices/summary/"),
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
    list: (options, abort?: boolean) => get("/individuals/", options, { abort }),
    listExport: options => get("/individuals/list_export/", {format: "csv", ...options}),
    search: (q, options) => get("/individuals/search/", { q, ...options }),
  },

  instruments: {
    list: (options) => get("/instruments/", options),
  },

  instrumentTypes: {
    list: (options) => get("/instrument-types/", options),
  },

  libraries: {
    get: libraryId => get(`/libraries/${libraryId}/`),
    list: (options, abort?: boolean) => get("/libraries/", options, { abort }),
    listExport: options => get("/libraries/list_export/", {format: "csv", ...options}),
    summary: () => get("/libraries/summary/"),
    template: {
      actions: () => get(`/libraries/template_actions/`),
      check:  (action, template) => post(`/libraries/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/libraries/template_submit/`, form({ action, template })),
    },
    prefill: {
      templates: () => get(`/libraries/list_prefills/`),
      request: (options, template) => filteredpost(`/libraries/prefill_template/`, {...options}, form({ template: template })),
    },
    search: q => get("/libraries/search/", { q }),
  },

  libraryTypes: {
    get: libraryTypeId => get(`/library-types/${libraryTypeId}/`),
    list: (options, abort?: boolean) => get("/library-types/", options, { abort }),
  },

  metrics: {
    getReadsPerSampleForLane: (experimentRunId, lane) => get(`/metrics/`, {limit: 100000, name: 'nb_reads', metric_group: 'qc', readset__dataset__experiment_run_id: experimentRunId, readset__dataset__lane: lane})
  },

  platforms: {
    get: platformId => get(`/platforms/${platformId}/`),
    list: (options, abort?: boolean) => get("/platforms/", options, { abort }),
  },

  pooledSamples: {
    list: (options: any, abort?: boolean) => get<JsonResponse<FMSPagedResultsReponse<FMSPooledSample>>>("/pooled-samples/", options, { abort }),
    listExport: options => get("/pooled-samples/list_export/", {format: "csv", ...options}),
  },

  processes: {
    get: processId => get(`/processes/${processId}/`),
    list: (options, abort?: boolean) => get("/processes/", options, { abort }),
  },

  processMeasurements: {
    get: processMeasurementId => get(`/process-measurements/${processMeasurementId}/`),
    list: (options, abort?: boolean) => get("/process-measurements/", options, { abort }),
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
    list: (options, abort?: boolean) => get<JsonResponse<FMSPagedResultsReponse<FMSProject>>>("/projects/", options, { abort }),
    listExport: options => get("/projects/list_export/", {format: "csv", ...options}),
    summary: () => get("/projects/summary/"),
    template: {
      actions: () => get(`/projects/template_actions/`),
      check:  (action, template) => post(`/projects/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/projects/template_submit/`, form({ action, template })),
    },
  },

  propertyValues: {
    list: (options, abort?: boolean) => get("/property-values/", options, { abort }),
  },

  protocols: {
    list:  (options, abort?: boolean) => get("/protocols/", options, { abort }),
    lastProtocols: (options, abort?: boolean) => get<JsonResponse<{sample_result: FMSSample['id'], protocol: FMSProtocol['name']}[]>>("/protocols/last_protocols/", options, { abort }),
  },

  referenceGenomes: {
    get: referenceGenomeId => get(`/reference-genomes/${referenceGenomeId}`),
    add: referenceGenome => post(`/reference-genomes/`, referenceGenome),
    update: referenceGenome => patch(`/reference-genomes/${referenceGenome.id}/`, referenceGenome),
    list: (options, abort?: boolean) => get('/reference-genomes/', options, { abort }),
    search: q => get("/reference-genomes/search/", { q }),
  },

  samples: {
    get: sampleId => get(`/samples/${sampleId}/`),
    add: sample => post("/samples/", sample),
    addSamplesToStudy: (exceptedSampleIDs: Array<FMSSample['id']>, defaultSelection: boolean, projectId: FMSProject['id'], studyLetter: FMSStudy['letter'], stepOrder: WorkflowStepOrder['order'], queryParams?: QueryParams) =>
      filteredpost<StringResponse>(`/samples/add_samples_to_study/`, queryParams, { excepted_sample_ids: exceptedSampleIDs, default_selection: defaultSelection, project_id: projectId, study_letter: studyLetter, step_order: stepOrder }),
    update: sample => patch(`/samples/${sample.id}/`, sample),
    list: (options, abort?: boolean) => get<JsonResponse<FMSPagedResultsReponse<FMSSample>>>("/samples/", options, { abort }),
    listExport: options => get("/samples/list_export/", {format: "csv", ...options}),
    listExportMetadata: options => get("/samples/list_export_metadata/", {format: "csv", ...options}),
    listCollectionSites: (filter) => get("/samples/list_collection_sites/", { filter }),
    listVersions: sampleId => get(`/samples/${sampleId}/versions/`),
    summary: () => get("/samples/summary/"),
    template: {
      actions: () => get(`/samples/template_actions/`),
      check:  (action, template) => post(`/samples/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/samples/template_submit/`, form({ action, template })),
    },
    prefill: {
      templates: () => get(`/samples/list_prefills/`),
      request: (options, template) => filteredpost(`/samples/prefill_template/`, {...options}, form({ template: template })),
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
    listSamples: (sampleIDs: FMSId[]) => get<JsonResponse<FMSPagedResultsReponse<FMSSampleNextStep>>>('/sample-next-step/', {sample__id__in: sampleIDs.join(','), limit: 100000}),
    getStudySamples: (studyId) => get('/sample-next-step/', {studies__id__in : studyId}),
    executeAutomation: (stepId, additionalData, options) => filteredpost(`/sample-next-step/execute_automation/`, {...options}, form({step_id: stepId, additional_data: additionalData, ...options}),),
    labworkSummary: () => get('/sample-next-step/labwork_info/'),
    labworkStepSummary: (stepId: FMSId, groupBy: string, options?: QueryParams, sample__id__in?: FMSId[]) => filteredpost<JsonResponse<LabworkStepInfo>>('/sample-next-step/labwork_step_info/', {...options, step__id__in: stepId, group_by: groupBy}, { sample__id__in }),
    listSamplesAtStep: (stepId: FMSId, options?: QueryParams, sample__id__in?: FMSId[]) => filteredpost<JsonResponse<FMSPagedResultsReponse<FMSSampleNextStep>>>('/sample-next-step/list_post/', {limit: 100000, ...options, step__id__in: stepId}, { sample__id__in }),
    prefill: {
      templates: (protocolId) => get('/sample-next-step/list_prefills/', {protocol: protocolId}),
      request: (templateID: FMSId, user_prefill_data: string, placement_data: string, sample__id__in: string,  options?: QueryParams) => filteredpost<ArrayBufferResponse>('/sample-next-step/prefill_template/',{...options}, form({user_prefill_data: user_prefill_data, placement_data: placement_data, template: templateID.toString(), sample__id__in }))
    },
    template: {
      actions: () => get(`/sample-next-step/template_actions/`),
      check:  (action, template) => post(`/sample-next-step/template_check/`, form({ action, template })),
      submit: (action, template) => post(`/sample-next-step/template_submit/`, form({ action, template })),
    },
  },

  sampleNextStepByStudy: {
    getStudySamples: (options: any) => get<JsonResponse<FMSPagedResultsReponse<FMSSampleNextStepByStudy>>>('/sample-next-step-by-study/', {...options}),
    getStudySamplesForStepOrder: (studyId, stepOrderID, options) => get(`/sample-next-step-by-study/`, {...options, study__id__in : studyId, step_order__id__in : stepOrderID }),
    countStudySamples: (studyId, options) => get(`/sample-next-step-by-study/summary_by_study/`, {...options, study__id__in: studyId}),
    remove: sampleNextStepByStudyId => remove(`/sample-next-step-by-study/${sampleNextStepByStudyId}/`),
    removeList: (sampleIDs: FMSId[], study: FMSStudy['id'], stepOrder: number) => post<JsonResponse<Array<FMSSample['id']>>>(`/sample-next-step-by-study/destroy_list/`, { sample_ids: sampleIDs, study, step_order: stepOrder }),
    list: (options, abort?: boolean) => get("/sample-next-step-by-study/", { limit: 100000, ...options }, { abort }),
  },

  samplesheets: {
    getSamplesheet: (barcode, kind, placementData) => post('/samplesheets/get_samplesheet/', { container_barcode: barcode, container_kind: kind, placement: placementData }),
  },

  sequences: {
    get: sequenceId => get(`/sequences/${sequenceId}/`),
    list: (options, abort?: boolean) => get("/sequences/", options, { abort }),
  },

  stepHistory: {
    getCompletedSamplesForStudy: (studyId, options) => get<JsonResponse<FMSPagedResultsReponse<FMSStepHistory>>>('/step-histories/', {...options, study__id__in: studyId}),
    countStudySamples: (studyId) => get(`/step-histories/summary_by_study/`, {study__id__in: studyId})
  },

  steps: {
    list: (options, abort?: boolean) => get<JsonResponse<FMSPagedResultsReponse<FMSStep>>>('/steps/', options, { abort} ),
  },

  studies: {
    get: studyId => get<JsonResponse<FMSStudy>>(`/studies/${studyId}/`),
    add: study => post("/studies/", study),
    update: study => patch(`/studies/${study.id}/`, study),
    list: (options, abort?: boolean) => get<JsonResponse<FMSPagedResultsReponse<FMSStudy>>>('/studies/', options, {abort}),
    listProjectStudies: projectId => get('/studies/', { project_id: projectId}),
    remove: (studyId) => remove(`/studies/${studyId}/`)
  },

  taxons: {
    get: taxonId => get(`/taxons/${taxonId}/`),
    add: taxon => post(`/taxons/`, taxon),
    update: taxon => patch(`/taxons/${taxon.id}/`, taxon),
    list: (options, abort?: boolean) => get("/taxons/", options, { abort }),
    search: q => get("/taxons/search/", { q }),
  },

  users: {
    get: userId => get(`/users/${userId}/`),
    add: user => post("/users/", user),
    update: user => patch(`/users/${user.id}/`, user),
    updateSelf: user => patch(`/users/update_self/`, user),
    list: (options, abort?: boolean) => get("/users/", options, { abort }),
    listRevisions: (userId, options = {}) => get(`/revisions/`, { user_id: userId, ...options }),
    listVersions: (userId, options = {}) => get(`/versions/`, { revision__user: userId, ...options }),
  },

  workflows: {
    get: (workflowId: FMSWorkflow['id']) => get<JsonResponse<FMSWorkflow>>(`/workflows/${workflowId}/`),
    list: (options, abort?: boolean) => get<JsonResponse<FMSPagedResultsReponse<FMSWorkflow>>>('/workflows/', options, { abort })
  },

  groups: {
    list: (options, abort?: boolean) => get("/groups/", options, { abort }),
  },

  query: {
    search: q => get("/query/search/", { q }, { abort: true }),
  },

  sample_lineage: {
    get: (sampleId: FMSId) => get<JsonResponse>(`/sample-lineage/${sampleId}/graph/`)
  },

  report: {
    listReports: () => get<JsonResponse<{ name: string, display_name: string }[]>>("/reports/"),
    listReportInformation: (name: string) => get<JsonResponse<FMSReportInformation>>(`/reports/${name}/`),
    getReport:        (name: string, start_date: string, end_date: string, time_window = "month", group_by: string[] = []) => get<JsonResponse<FMSReportData>>(`/reports/${name}/`, { group_by, time_window, start_date, end_date }),
    getReportAsExcel: (name: string, start_date: string, end_date: string, time_window = "month", group_by: string[] = []) => get<ArrayBufferResponse>        (`/reports/${name}/`, { group_by, time_window, start_date, end_date, export: true }),
  }
}


export default api;

type AuthTokensAccess = Partial<Omit<RootState, 'auth'>> & Pick<RootState, 'auth'>

export function dispatchForApi<T>(token: string | undefined, thunk: (_: Dispatch<AnyAction>, getState: () => AuthTokensAccess) => T): T {
  return thunk(undefined as unknown as Dispatch<AnyAction>, () => ({ auth: { isFetching: false, error: null, currentUserID: null, tokens: { access: token, refresh: null }, _persist: { version: 0, rehydrated: false } } }))
}

type WithTokenFn<R extends ResponseWithData<any>, Args extends any[]> = (...args: Args) => (dispatch: Dispatch<AnyAction>, getState: () => AuthTokensAccess) => Promise<R>
export function withToken<R extends ResponseWithData<any>, Args extends any[]>(token: string | undefined, fn: WithTokenFn<R, Args>) {
    // dispatch is hopefully not used in the fn function
    return (...args: Parameters<typeof fn>) => dispatchForApi(token, fn(...args))
}

const ongoingRequests: Record<string, AbortController> = {}

type HTTPMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH'
interface APIFetchOptions {
    abort?: boolean
}

export const ABORT_ERROR_NAME = 'AbortError'

function apiFetch<R extends ResponseWithData<any>>(method: HTTPMethod, route: string, body?: any, options: APIFetchOptions = { abort: false }) {
    const baseRoute = getPathname(route)

    return (_: Dispatch<AnyAction>, getState: (() => AuthTokensAccess)) => {

        const accessToken = getState().auth.tokens.access;

        const headers = {}

        if (accessToken)
            headers["authorization"] = `Bearer ${accessToken}`

        if (!isFormData(body) && isObject(body))
            headers["content-type"] = "application/json"

        // For abortable requests
        let signal: AbortSignal | undefined
        if (options.abort) {
            const controller = new AbortController()
            signal = controller.signal
            if (ongoingRequests[baseRoute]) {
                ongoingRequests[baseRoute].abort({
                    name: ABORT_ERROR_NAME,
                    message: `Request aborted for request to ${baseRoute}`,
                })
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
            .then((response) => attachData<R>(response))
            .then(response => {
                if (response.ok) {
                    return response;
                }
                return Promise.reject(createAPIError(response));
            })
    };
}

export type QueryParams = Parameters<typeof qs>[0]

function get<R extends ResponseWithData<any>>(route: string, queryParams?: QueryParams, options?: APIFetchOptions) {
    const fullRoute = route + (queryParams ? '?' + qs(queryParams) : '')
    return apiFetch<R>('GET', fullRoute, undefined, options);
}

function filteredpost<R extends ResponseWithData<any>>(route: string, queryParams: QueryParams, body: any, options?: APIFetchOptions) {
    const fullRoute = route + (queryParams ? '?' + qs(queryParams) : '')
    return apiFetch<R>('POST', fullRoute, body, options);
}

function post<R extends ResponseWithData<any>>(route: string, body: any, options?: APIFetchOptions) {
    return apiFetch<R>('POST', route, body, options);
}

function patch<R extends ResponseWithData<any>>(route: string, body: any, options?: APIFetchOptions) {
    return apiFetch<R>('PATCH', route, body, options);
}

function remove<R extends ResponseWithData<any>>(route: string) {
    return apiFetch<R>('DELETE', route);
}

interface ApiError extends Omit<Error, 'stack'> {
    name: 'APIError'
    message: string
    stack: string[]
    data: Record<string, string[]>
    fromAPI: boolean
    status: number
    statusText: string
    url: string
}
function createAPIError<R extends ResponseWithData<any>>(response: R): ApiError {
    const data = response.data;
    let detail: any;

    // Server errors
    if (response.isJSON && response.status === 400) {
        detail = JSON.stringify(data, null, 2)
    }
    else {
        // API error as { ok: false, detail: ... }
        try {
            detail = data.detail ||
                (data.revision__user && ('User: ' + data.revision__user.join(', ')));
        } catch (_) { }
    }

    const message = detail ?
        ('API error: ' + detail) :
        (`HTTP error ${response.status}: ` + response.statusText + ': ' + response.url)

    const error = new Error(message) as unknown as ApiError;
    error.name = 'APIError';
    error.fromAPI = Boolean(detail);
    error.data = data || {};
    error.url = response.url;
    error.status = response.status;
    error.statusText = response.statusText;
    error.stack = []

    return error;
}

export interface FMSResponse<T = any> extends Response {
    isJSON: boolean
    data: T
    filename?: string
}
interface JsonResponse<T = any> extends FMSResponse<T> { isJSON: true }
interface ArrayBufferResponse extends FMSResponse<ArrayBuffer> { isJSON: false }
interface StringResponse extends FMSResponse<string> { isJSON: false }
interface AttachDataErrorResponse extends FMSResponse<Record<string, never>> { isJSON: false }
type ResponseWithData<T = any> = JsonResponse<T> | ArrayBufferResponse | StringResponse | AttachDataErrorResponse

function attachData<R extends ResponseWithData<any>>(response: Response & Partial<ResponseWithData>) {
    const contentType = response.headers.get('content-type') || '';
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
            return response as R
        })
        .catch(() => {
            response.data = {};
            return response as R // as AttachDataErrorResponse (ideally)
        })
}

function getFilenameOrNull(contentDispo: string | null) {
    if (contentDispo)
        return contentDispo.split('filename=').length > 1
            // eslint-disable-next-line no-useless-escape
            ? contentDispo.split('filename=')[1].replace(/^.*[\\\/]/, '')
            : null
    else
        return null
}

function form(params: Record<string, string | Blob>) {
    const formData = new FormData()
    for (const key in params) {
        const value = params[key]
        formData.append(key, value)
    }
    return formData
}

function isObject(object: any): object is object {
    return object !== null && typeof object === 'object'
}

function isFormData(object: any): object is FormData {
    return object instanceof FormData
}

function getPathname(route: string) {
    return route.replace(/\?.*$/, '')
}