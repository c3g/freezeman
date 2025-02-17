import React from "react";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { WorkflowAssignment } from "./WorkflowAssignment";

export function WorkflowAssigmentPage() {
  return (<>
        <AppPageHeader title="Queue/Dequeue Samples and Libraries to Workflow Step" />
        <PageContent>
            <WorkflowAssignment />
        </PageContent>
  </>)
}