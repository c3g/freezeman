import React from "react"
import { Pagination, Table } from "antd"

export const PaginatedList = ({tableProps, paginationProps}) => {
    
    return <>
        <Table
            {...tableProps}
        />
        <Pagination
            {...paginationProps}
        />
    </>
}

export default PaginatedList