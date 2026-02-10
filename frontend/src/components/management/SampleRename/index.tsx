import React, { useEffect, useState } from "react"
import PooledSamples, { PooledSampleColumnID } from "../PooledSamples"
import { FMSTemplateAction, FMSTemplatePrefillOption } from "../../../models/fms_api_models"
import { useAppDispatch } from "../../../hooks"
import api from "../../../utils/api"

const columns = [
    PooledSampleColumnID.CONTAINER_BARCODE,
    PooledSampleColumnID.COORDINATES,
    PooledSampleColumnID.ALIAS,
    PooledSampleColumnID.NAME,
    PooledSampleColumnID.INDEX,
] as const

const TABLE_HEIGHT = '75vh'

export function SampleRename() {
    const dispatch = useAppDispatch()

    const [templateAction, setTemplateAction] = useState<FMSTemplateAction>()
        useEffect(() => {
            dispatch(api.pooledSamples.template.actions()).then(response => {
                setTemplateAction(
                    response.data.find(action => action.name === "Rename Sample")
                )
            })
        }, [dispatch])
    
    const [templatePrefill, setTemplatePrefill] = useState<FMSTemplatePrefillOption>()
        useEffect(() => {
            dispatch(api.pooledSamples.prefill.templates()).then(response => {
                setTemplatePrefill(
                    response.data.find(prefill => prefill.description === "Template to rename sample (and its alias)")
                )
            })
        }, [dispatch])

    return <PooledSamples
        columns={columns}
        tableHeight={TABLE_HEIGHT}
        title={"Rename Sample"}
        actionUrlBase={"/management/sample-rename"}
        templateAction={templateAction}
        templatePrefill={templatePrefill}
    />
}
export default SampleRename
