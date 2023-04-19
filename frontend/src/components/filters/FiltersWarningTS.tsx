import React from "react";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip, Typography } from "antd";
import FiltersInfo from "./FiltersInfoTS";
const { Text } = Typography

interface FiltersWarning {
    filters: any,
    nFilters: number
}

const FiltersWarning = ({ filters, nFilters }: FiltersWarning) => {
    if (nFilters === 0)
        return null
    return (
        <Tooltip placement={'bottom'} title={<FiltersInfo filters={filters}/>}>
            <span style={{ marginRight: '1rem' }}>
                <Text type="warning"
                    style={{
                        marginLeft: 8,
                        marginRight: 8,
                    }}
                >
                    {nFilters} filter{nFilters > 1 ? 's' : ''} applied <QuestionCircleOutlined />
                </Text>
            </span>
        </Tooltip>
    )
}

export default FiltersWarning