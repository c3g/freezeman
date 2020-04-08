import React from "react";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TemplateFlow from "../TemplateFlow";

const ContainersMoveContent = () => <>
    <AppPageHeader title="Move Containers" onBack={() => {}} />
    <PageContent>
        <TemplateFlow uploadText="Upload the provided template with up to 100 containers to move." />
    </PageContent>
</>;

export default ContainersMoveContent;
