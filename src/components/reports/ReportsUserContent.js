import React from "react";

import itemRender from "../../utils/breadcrumbItemRender";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import routes from "./routes";

const route = {
  path: "/user",
  breadcrumbName: "User",
};

const ReportsUserContent = () => <>
  <AppPageHeader
    title="User"
    breadcrumb={{ routes: routes.concat(route), itemRender }}
  />
  <PageContent>
    User
  </PageContent>
</>;

export default ReportsUserContent;
