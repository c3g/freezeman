import React from "react"
import { Button, Pagination, Table } from "antd"
import FiltersWarning from "../filters/FiltersWarning"

export const PaginatedList = ({tableProps, paginationProps, filtersProps}) => {
    const { filtersWarningProps, clearFilterProps } = filtersProps
    
    return <>
        { filtersProps &&
            <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1rem' }}>
                <FiltersWarning {...filtersWarningProps} />
                <Button {...clearFilterProps}>
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
    </>
}

export default PaginatedList