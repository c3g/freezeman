import React from "react"
import { Button, Pagination, Table } from "antd"
import FiltersWarning from "../filters/FiltersWarning"
import PageContent from "../PageContent"

export const PaginatedList = ({tableProps, paginationProps, filtersWarningProps, clearFilterProps, other=<></>}) => {
    
    return <PageContent>
        {(filtersWarningProps || clearFilterProps) &&
            <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1rem', float: 'right' }}>
                {filtersWarningProps && <FiltersWarning {...filtersWarningProps} />}
                {clearFilterProps && <Button {...clearFilterProps} style={{ margin: 6 }}>
                    Clear Filters
                </Button>}
                {other}
            </div>
        }
        <Table
            {...tableProps}
        />
        <Pagination
            {...paginationProps}
        />
    </PageContent>
}

export default PaginatedList