import React from "react";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TemplateFlow from "../TemplateFlow";

const ExtractionsProcessContent = () => <>
    <AppPageHeader title="Process Extractions" onBack={() => {}} />
    <PageContent>
        <TemplateFlow uploadText="Upload the provided template with up to 384 extractions." />
    </PageContent>
</>;

export default ExtractionsProcessContent;
