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
  volume_history: null, // 
  concentration: null,
  depleted: false,
  experimental_group: null, // string[]
  collection_site: "", // string(200)
  tissue_source: null, // enum
  reception_date: null, // date
  phenotype: "", // string(200)
  comment: "", // string(200)
  update_comment: "", // string(200)
  coordinates: "", // string(10)
  volume_used: null, // float
  individual: null, // individual.id
  container: null, // container.id
  extracted_from: null // sample.id
}
// Example:
// {
//     id: 9551,
//     sample_kind: 1,
//     name: "0110",
//     alias: "",
//     volume_history: [
//         {
//             date: "2020-06-16T14:05:30.346822Z",
//             update_type: "update",
//             volume_value: "200.000"
//         }
//     ],
//     concentration: "31.448",
//     depleted: false,
//     experimental_group: [],
//     collection_site: "JGH",
//     tissue_source: "Blood",
//     reception_date: "2020-06-16",
//     phenotype: "",
//     comment: "Extraction done using Chemagen CMG-1091",
//     update_comment: "",
//     coordinates: "",
//     volume_used: "250.000",
//     individual: 401,
//     container: 1658,
//     extracted_from: 5797
// }

export const individual = {
  name: "",
  taxon: null,
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
//     taxon: "Sars-Cov-2",
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
  // is_active: true, // To soft-delete the user
  is_staff: false,
  is_superuser: false,
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
//     "date_joined": "2021-02-19T17:10:07.503174Z"
// }
