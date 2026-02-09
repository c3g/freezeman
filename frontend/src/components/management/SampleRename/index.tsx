import React from "react"
import PooledSamples, { PooledSampleColumnID } from "../PooledSamples"

const columns = [
    PooledSampleColumnID.CONTAINER_BARCODE,
    PooledSampleColumnID.COORDINATES,
    PooledSampleColumnID.ALIAS,
    PooledSampleColumnID.NAME,
    PooledSampleColumnID.INDEX,
] as const

const TABLE_HEIGHT = '75vh'

export function SampleRename() {
    return <PooledSamples
        columns={columns}
        tableHeight={TABLE_HEIGHT}
        title={"Rename Sample"}
        actionUrlBase={"/management/sample-rename"}
    />
}
export default SampleRename
