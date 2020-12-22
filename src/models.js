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
  biospecimen_type: null,
  name: "",
  alias: "",
  volume_history: null, // 
  concentration: null,
  depleted: false,
  experimental_group: null,
  collection_site: "",
  tissue_source: null,
  reception_date: null,
  phenotype: "",
  comment: "",
  update_comment: "",
  coordinates: "",
  volume_used: null,
  individual: null,
  container: null,
  extracted_from: null
}
// Example:
// {
//     id: 9551,
//     biospecimen_type: "DNA",
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
  label: "",
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
//     label: "L00217559",
//     taxon: "Sars-Cov-2",
//     sex: "Unknown",
//     pedigree: "L00217559",
//     cohort: "INSPQ_COVID",
//     mother: null,
//     father: null
// }
