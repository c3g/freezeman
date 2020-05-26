import React from "react";

import {
    ExperimentOutlined,
    SolutionOutlined,
} from "@ant-design/icons";

const reports = [
  {
    title: "Sample",
    icon: <ExperimentOutlined />,
    description: "View report for a single sample",
    path: "/reports/sample",
  },
  {
    title: "User",
    icon: <SolutionOutlined />,
    description: "View report for a user",
    path: "/reports/user",
  },
];

export default reports;
