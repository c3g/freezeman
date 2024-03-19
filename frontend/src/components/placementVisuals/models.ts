export interface SampleInfo {
    coordinates: string,
    type: string,
    sourceContainer?: string
    name?: string,
    id?: number,
}
export interface CellSample {
    [id: number]: SampleInfo
}
export interface ContainerSample {
    samples: CellSample
    container_name: string,
    container_barcode?: string,
    rows: number,
    columns: number,
    container_kind: string,
}
