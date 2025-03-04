/*
 * Empty model objects that are used by forms to create new items.
 */

import { FMSSample } from "./fms_api_models"

export const container = {
    kind: null,
    name: "",
    barcode: "",
    coordinate: null,
    comment: "",
    update_comment: "",
    location: null, 
    children: [], 
    samples: [],
  } as const
  
  export const sample: FMSSample = {
    id: 0,
    name: "",
    alias: "",
    sample_kind: 0,
    volume: 0, //
    concentration: 0,
    depleted: false,
    experimental_group: [], // string[]
    collection_site: "", // string(200)
    tissue_source: undefined,
    creation_date: "", // date
    comment: "", // string(200)
    coordinate: 0, // coordinate.id
    container: 0, // container.id
    biosample_id: 0,
    is_library: false,
    is_pool: false,
    process_measurements: [],
    derived_samples_count: 0,
    created_at: "", // date
    updated_at: "", // date
    created_by: 0, // user.id
    updated_by: 0, // user.id
    deleted: false,
  } as const
  
  export const individual = {
    name: "",
    taxon: null, // taxon.id
    reference_genome: null, // reference_genome.id
    sex: null,
    pedigree: "",
    cohort: "",
    mother: null,
    father: null
  } as const
  
  export const user = {
    username: "",
    first_name: null,
    last_name: null,
    email: null,
    password: "",
    groups: [],
    // user_permissions: [], // To be implemented maybe
    is_staff: false,
    is_superuser: false,
    is_active: true, // To soft-delete the user
    // last_login: null,
    date_joined: null,
  } as const
  
  export const project = {
    name: "",
    principal_investigator: "",
    requestor_name: "",
    requestor_email: "",
    targeted_end_date: "",
    status: "Open",
    comment: "",
  } as const
