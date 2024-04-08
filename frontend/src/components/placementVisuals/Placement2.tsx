import React, { useCallback, useEffect, useMemo, useState } from "react"
import { FMSId } from "../../models/fms_api_models"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { loadSamplesAndContainers } from "../../modules/placement/actions"

interface PlacementProps {
    sampleIDs: number[],
    stepID: FMSId,
}

const Placement = ({ stepID, sampleIDs }: PlacementProps) => {
    const dispatch = useAppDispatch()
    const placementState = useAppSelector((state) => state.placement)
    const sourceContainers = useMemo(() => {
        const containers = [...Object.keys(placementState.parentContainers)]
        containers.sort()
        return containers
    }, [placementState.parentContainers])

    useEffect(() => {
        dispatch(loadSamplesAndContainers(stepID, sampleIDs))
    })
}
export default Placement
