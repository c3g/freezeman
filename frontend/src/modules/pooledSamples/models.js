/*
type ObjectId = number

interface Index {
    id: ObjectId
    index_set: string
    index_structure: string
    name: string
    sequences_3prime: string[]
    sequences_5prime: string[]
}

interface Library {
    id: ObjectId
    library_type: string
    platform: string
    index: Index
    library_size: number
    strandedness: 'Double stranded' | 'Single stranded'
}

interface Biosample {
    id: ObjectId
    alias?: string
    collection_size: string
    individual: ObjectId
}

interface TissueSource {
    name: string
    is_extracted: boolean
}

type SampleKind = TissueSource

interface DerivedSample {
    readonly id: string,
    readonly library?: Readonly<Library>,
    readonly biosample?: Readonly<Biosample>,
    readonly tissue_source: Readonly<TissueSource>
    readonly sample_kind: Readonly<SampleKind>
}

interface PooledSample {
    readonly id: string
    readonly volume_ratio: number,
    readonly derived_sample: Readonly<DerivedSample>
    readonly sample_name: string
    readonly sample_id: string
}

export interface PoolReply {
    pools: PooledSample[]
}

export const getSomePools = async () : Promise<PoolReply> => {
    return Promise.resolve({pools: []})
}
*/

/* Example of sample data returned.
 {
    "volume_ratio": "0.500",
    "derived_sample": {
        "id": 392696,
        "library": {
            "id": 6,
            "library_type": "PCR-free",
            "platform": "ILLUMINA",
            "index": {
                "id": 13133,
                "index_set": "IDT_10nt_UDI_TruSeq_Adapter",
                "index_structure": "TruSeqHT",
                "name": "IDT_10nt_UDI_i7_002-IDT_10nt_UDI_i5_002",
                "sequences_3prime": [
                    7094
                ],
                "sequences_5prime": [
                    7093
                ]
            },
            "library_size": "100",
            "strandedness": "Double stranded"
        },
        "biosample": {
            "id": 296342,
            "alias": null,
            "collection_site": "MUHC",
            "individual": 189385
        },
        "tissue_source": {
            "name": "BLOOD",
            "is_extracted": false
        },
        "sample_kind": {
            "name": "DNA",
            "is_extracted": true
        },
        "experimental_group": []
    },
    "id": 392696,
    "sample_name": "CK-SAMPLE-2",
    "sample_id": 727302
}
*/


