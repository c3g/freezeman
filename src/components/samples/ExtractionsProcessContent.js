import React from "react";

import AppPageHeader from "../AppPageHeader";
import TemplateFlow from "../TemplateFlow";

const ExtractionsProcessContent = () => <>
    <AppPageHeader title="Process Extractions" onBack={() => {}} />
    <div style={{padding: "16px 24px 0 24px", overflowX: "auto"}}>
        <TemplateFlow uploadText="Upload the provided template with up to 384 extractions." />
    </div>
</>;

export default ExtractionsProcessContent;
