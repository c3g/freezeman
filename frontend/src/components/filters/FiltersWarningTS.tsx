import React from "react";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip, Typography } from "antd";
import FiltersInfos from "./FiltersInfos";
const { Text } = Typography

interface FiltersWarning {
    filters: any,
    nFilters: number
}

const FiltersWarning = ({ filters, nFilters }: FiltersWarning) => {
    return (
        <Tooltip placement={'bottom'} title={<FiltersInfos filters={filters} description={filters.description} />}>
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