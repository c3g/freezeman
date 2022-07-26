import React from "react"
import { Button, Pagination, Table } from "antd"
import FiltersWarning from "../filters/FiltersWarning"
import PageContent from "../PageContent"

export const PaginatedList = ({tableProps, paginationProps, filtersProps}) => {
    const { filtersWarningProps, clearFilterProps } = filtersProps
    
    return <PageContent>
        { filtersProps &&
            <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1rem' }}>
                <FiltersWarning {...filtersWarningProps} />
                <Button {...clearFilterProps} style={{ margin: 6 }}>
                    Clear Filters
                </Button>
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