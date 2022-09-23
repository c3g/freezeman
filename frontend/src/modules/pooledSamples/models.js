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

interface Pool {
    readonly volume_ratio: number,
    readonly derived_sample: Readonly<DerivedSample>
}

export interface PoolReply {
    pools: Pool[]
}

export const getSomePools = async () : Promise<PoolReply> => {
    return Promise.resolve({pools: []})
}
*/

