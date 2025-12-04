import React from "react"
import { useCallback } from "react";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { WorkflowAssignment } from "./WorkflowAssignment";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { actions } from "../../modules/workflowAssignment/reducers"
import { useNavigate } from "react-router-dom";
import { FMSId } from "../../models/fms_api_models";
import { selectWorkflowAssignmentState } from "../../modules/workflowAssignment/selectors";

export function WorkflowAssignmentPage() {
  const initialExceptSampleIDs = useAppSelector(selectWorkflowAssignmentState).initialExceptedSampleIDs

  return (<>
        <AppPageHeader title="Manage Assignment of Samples to Study Workflows" />
        <PageContent>
            <WorkflowAssignment initialExceptedSampleIDs={initialExceptSampleIDs} />
        </PageContent>
  </>)
}

export function useNavigateToWorkflowAssignment() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  return useCallback((queryParameters?: string, initialSelections: FMSId[] = []) => {
    dispatch(actions.setInitialExceptedSampleIDs(initialSelections))
    navigate(`/management/workflow-assignment${queryParameters ? `?${queryParameters}` : ''}`);
  }, [dispatch, navigate])
}