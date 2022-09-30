/*
 * models.js
 */

export const container = {
  // id: Number,
  kind: null,
  name: "",
  barcode: "",
  coordinates: "",
  comment: "",
  update_comment: "",
  location: null, // container.id
  children: [], // container.id[]
  samples: [], // sample.id[]
}
// Example:
// {
//     id: 94,
//     children: [],
//     samples: [
//         5772
//     ],
//     kind: "tube",
//     name: "EQ00407137",
//     barcode: "EQ00407137",
//     coordinates: "C01",
//     comment: "",
//     update_comment: "",
//     location: 169
// }

export const sample = {
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
  coordinates: "", // string(10)
  individual: null, // individual.id
  container: null, // container.id
  extracted_from: null, // sample.id
  project: null // project.id
}
// Example:
// {
//     id: 9551,
//     sample_kind: 1,
//     name: "0110",
//     alias: "",
//     volume: "200.000"
//     concentration: "31.448",
//     depleted: false,
//     experimental_group: [],
//     collection_site: "JGH",
//     tissue_source: 5,
//     creation_date: "2020-06-16",
//     comment: "Extraction done using Chemagen CMG-1091",
//     coordinates: "",
//     individual: 401,
//     container: 1658,
//     extracted_from: 5797,
//     project: 21
// }

export const individual = {
  name: "",
  taxon: null, // taxon.id
  sex: null,
  pedigree: "",
  cohort: "",
  mother: null,
  father: null
}
// Example:
// {
//     id: 100,
//     name: "L00217559",
//     taxon: 1, 
//     sex: "Unknown",
//     pedigree: "L00217559",
//     cohort: "INSPQ_COVID",
//     mother: null,
//     father: null
// }
//

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
}
// Example:
// {
//     "id": 19,
//     "username": "romgrk",
//     "email": "romain.gregoire@mcgill.ca",
//     "groups": [],
//     "is_staff": true,
//     "is_superuser": true,
//     "is_active": true,
//     "date_joined": "2021-02-19T17:10:07.503174Z"
// }

export const project = {
  // id: Number,
  name: "",
  principal_investigator: "",
  requestor_name: "",
  requestor_email: "",
  targeted_end_date: "",
  status: "Open",
  comment: "",
}
// Example:
// {
//     id: 94,
//     name: "BQC19",
//     principal_investigator: "David Bujold",
//     requestor_name: "Sebastian Ballesteros",
//     requestor_email: "sebastian.ballesteros@mcgill.ca",
//     status: "Open",
//     comment: "This is a comment",
// }

export const sequence = {
  // id: Number,
  value: "",
}
// Example:
// {
//     id: 2001,
//     value: "GTCTAACTG",
// }

export const library = {
  // id: Number,
  name: "",
  biosample_id: null, // biosample.id
  container: null, // container.id
  coordinates: "", // string(10)
  volume: null, //
  concentration_ng_ul: null,
  concentration_nm: null,
  quantity_ng: null,
  creation_date: null, // date
  quality_flag: "", // passed or failed
  quantity_flag: "", // passed or failed
  project: null, // project.id
  depleted: false,
  library_type: "", // string(200)
  platform: "", // string(200)
  index: "", // string(200)
  library_size: null, // int
  is_pool: false, // bool
}
// Example:
// {
//     id: 9551,
//     name: "Lib_mgi_01",
//     container: 1658,
//     coordinates: "A01",
//     volume: "200.000"
//     concentration_ng_ul: "31.448",
//     concentration_nm: "1.480",
//     quantity_ng: "43.480",
//     creation_date: "2020-06-16",
//     quality_flag: "passed",
//     quantity_flag: "failed",
//     project: 1
//     depleted: false,
//     library_type: "RNASeq",
//     platform: "DNBSEQ",
//     index: "Index_2",
//     library_size: 250,
//     is_pool: true
// }

export const index = {
  // id: Number,
  name: "",
  index_set: null, // indexSet.id
  index_structure: null, // indexStructure.id
  sequences_3prime: [], // sequence.id
  sequences_5prime: [], // sequence.id
}
// Example:
// {
//     id: 1312,
//     name: "Index_1",
//     index_set: 232,
//     index_structure: 41232,
//     sequences_3prime: [451, 43, 32],
//     sequences_5prime: [7333],
// }

export const platform = {
  // id: Number,
  name: "",
}
// Example:
// {
//     id: 12,
//     name: "DNBSEQ",
// }

export const libraryType = {
  // id: Number,
  name: "",
}
// Example:
// {
//     id: 202,
//     name: "RNASeq",
// }

export const taxon = {
  // id: Number,
  name: "",
  ncbi_id: null,
}
// Example:
// {
//     id: 1,
//     name: "Homo sapiens",
//     ncbi_id: 9606,
// }

export const importedFile = {
  // id: Number,
  filename: "",
  location: "",
}
// Example:
// {
//     id: 1,
//     filename: "sample_submission_v3_5_0.xlsx",
//     location: "/home/bob/mysite/templates/sample_submission_v3_5_0.xlsx",
// }


export const pooledSample = {
  // Note: Pooled sample is a flattened version of the pooled sample data returned by the endpoint.
  id: 1,                          // The id of the pooled derived sample (used as the id for the pooled sample)
  parent_sample_name: "",         // The name of the sample that was added to this pool
  parent_sample_id: "",           // The id of the sample that was added to this pool
  biosample_id: "",               // The biosample attached to the sample that was added to this pool
  alias: "",                      // The alias (from the biosample)
  project_name: "",               // Project associated with the derived sample
  project_id: "",                 // Project associated with the derived sample
  volume_ratio: "",               // Derived sample volume as a ratio of the total pool volume

  // library fields               // Library fields are only defined if pool contains libraries
  library_type: "",               // Library Type (eg. PCR-free)
  library_size: "",               // Library size (in bp)
  strandedness: "",               // "Double stranded" (for DNA) or "Single stranded" (for RNA)
  platform: "",                   // Platform (eg. ILLUMINA)
  index_set: "",                  // Name of index set containing library index
  index: "",                      // Name of index
  index_id: "",                   // ID of index
}