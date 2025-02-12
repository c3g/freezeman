import React from "react";
import AppPageHeader from "../../AppPageHeader";
import PageContent from "../../PageContent";
import { LabworkSamples } from "./LabworkSamples";

export function LabworkSamplesPage() {
  return (<>
        <AppPageHeader title="Samples and Libraries" />
        <PageContent>
            <LabworkSamples />
        </PageContent>
  </>)
}