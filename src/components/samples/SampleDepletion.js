import React from "react";

import {ExperimentFilled, ExperimentOutlined} from "@ant-design/icons";

export const SampleDepletion = ({depleted}) => depleted
    ? <span style={{color: "#f5222d"}}><ExperimentOutlined style={{marginRight: "8px"}} />Yes</span>
    : <span style={{color: "#a0d911"}}><ExperimentFilled style={{marginRight: "8px"}} />No</span>;
