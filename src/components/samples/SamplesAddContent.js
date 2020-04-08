import React from "react";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TemplateFlow from "../TemplateFlow";

const SamplesAddContent = () => <>
    <AppPageHeader title="Add Samples" onBack={() => {}} />
    <PageContent>
        <TemplateFlow uploadText="Upload the provided template with up to 384 new samples." />
    </PageContent>
</>;

export default SamplesAddContent;
