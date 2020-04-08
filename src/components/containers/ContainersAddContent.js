import React from "react";

import AppPageHeader from "../AppPageHeader";
import TemplateFlow from "../TemplateFlow";

const ContainersAddContent = () => <>
    <AppPageHeader title="Add Containers" onBack={() => {}} />
    <div style={{padding: "16px 24px 0 24px", overflowX: "auto"}}>
        <TemplateFlow uploadText="Upload the provided template with up to 100 new containers." />
    </div>
</>;

export default ContainersAddContent;
