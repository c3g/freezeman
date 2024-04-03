import React, { useCallback, useEffect, useState } from "react"
import Placement from "./Placement"
import { notification } from "antd"
import { useAppDispatch, useAppSelector, useSampleAndLibraryList } from "../../hooks"
import { selectContainerKindsByID } from "../../selectors";
import api from "../../utils/api"
import { FMSContainer, FMSId, SampleLocator } from "../../models/fms_api_models"
import { SampleAndLibrary } from "../WorkflowSamplesTable/ColumnSets";
import { loadSamplesAndContainers } from "../../modules/placement/actions";

interface PlacementTabProps {
    save: (changes) => void,
    sampleIDs: number[],
    stepID: FMSId,
}

//component used to display the tab for sample placement (plate visualization)
const PlacementTab = ({ save, sampleIDs, stepID }: PlacementTabProps) => {
    const dispatch = useAppDispatch()
    useEffect(() => {
        dispatch(loadSamplesAndContainers(stepID, sampleIDs))
    }, [dispatch, sampleIDs, stepID])
}
export default PlacementTab
