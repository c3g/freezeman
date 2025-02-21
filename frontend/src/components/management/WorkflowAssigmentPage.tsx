import React from "react";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { WorkflowAssignment } from "./WorkflowAssignment";

export function WorkflowAssigmentPage() {
  return (<>
        <AppPageHeader title="Manage Assignment of Samples to Study Workflows" />
        <PageContent>
            <WorkflowAssignment />
        </PageContent>
  </>)
}