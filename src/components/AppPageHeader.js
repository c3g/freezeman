import React from "react";

import {PageHeader} from "antd";
import "antd/es/page-header/style/css";

const AppPageHeader = ({...props}) =>
    <PageHeader ghost={false}
                style={{borderBottom: "1px solid #f0f0f0", marginBottom: "8px"}} {...props} />;

export default AppPageHeader;
