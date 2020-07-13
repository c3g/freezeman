import React from "react";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TemplateFlow from "../TemplateFlow";

const ContainersAddContent = () => <>
  <AppPageHeader title="Add Containers" onBack={() => {}} />
  <PageContent>
    <TemplateFlow uploadText="Upload the provided template with up to 100 new containers." />
  </PageContent>
</>;

export default ContainersAddContent;
