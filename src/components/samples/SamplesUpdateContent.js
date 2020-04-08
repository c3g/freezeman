import React from "react";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TemplateFlow from "../TemplateFlow";

const SamplesUpdateContent = () => <>
    <AppPageHeader title="Update Samples" onBack={() => {}} />
    <PageContent>
        <TemplateFlow uploadText="Upload the provided template with up to 384 samples to update." />
    </PageContent>
</>;

export default SamplesUpdateContent;
