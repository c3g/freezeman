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
  
export const sample = {
  id: null,
  name: "",
  alias: "",
  sample_kind: null,
  volume: null, //
  concentration: null,
  depleted: false,
  experimental_group: null, // string[]
  collection_site: "", // string(200)
  tissue_source: null,
  creation_date: null, // date
  comment: "", // string(200)
  coordinate: null, // coordinate.id
  individual: null, // individual.id
  container: null, // container.id
  extracted_from: null, // sample.id
  project: null // project.id
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
