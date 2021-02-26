import React from "react";

import itemRender from "../../utils/breadcrumbItemRender";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import routes from "./routes";

const route = {
  path: "/sample",
  breadcrumbName: "Sample",
};

const ReportsSampleContent = () => <>
  <AppPageHeader
    title="Samples"
    breadcrumb={{ routes: routes.concat(route), itemRender }}
  />
  <PageContent>
    Sample
  </PageContent>
</>;

export default ReportsSampleContent;
