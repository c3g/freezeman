import React from "react";
import AppPageHeader from "../../AppPageHeader";
import PageContent from "../../PageContent";
import { LabworkSamples } from "./LabworkSamples";

export function LabworkSamplesPage() {
  return (<>
        <AppPageHeader title="Queue/Dequeue Samples and Libraries to Workflow Step" />
        <PageContent>
            <LabworkSamples />
        </PageContent>
  </>)
}