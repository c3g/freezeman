import React from "react"
import PooledSamples, { PooledSampleColumnID } from "./PooledSamples"

const columns = [
    PooledSampleColumnID.ALIAS,
    PooledSampleColumnID.CONTAINER_BARCODE,
    PooledSampleColumnID.COORDINATES,
    PooledSampleColumnID.INDEX,
    PooledSampleColumnID.PROJECT,
] as const

const TABLE_HEIGHT = '75vh'

export function IndexCuration() {
    return <PooledSamples
        columns={columns}
        tableHeight={TABLE_HEIGHT}
        title={"Index Curation"}
        actionUrlBase={"/management/index-curations"}
    />
}
export default IndexCuration
