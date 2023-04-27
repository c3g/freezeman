import React from "react";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip, Typography } from "antd";
import FiltersInfo from "./FiltersInfoTS";
import { FilterSet } from "../../models/paged_items";
const { Text } = Typography

interface FiltersWarningProps {
    filters: FilterSet,
    nFilters: number
}

const FiltersWarning = ({ filters, nFilters }: FiltersWarningProps) => {
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