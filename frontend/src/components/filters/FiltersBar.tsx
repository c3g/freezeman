import React from "react";
import FiltersWarning from "./FiltersWarningTS";
import { Button } from "antd";
import { FilterSet } from "../../models/paged_items";
import getNFilters from "./getNFilters";
export interface FiltersBarProps {
    filters: FilterSet,
    clearFilters: () => void
}
const FiltersBar = ({ filters, clearFilters }: FiltersBarProps) => {

    const nFilters = getNFilters(filters ?? {})
    return (
        <div className='filters-warning-bar'>
            <FiltersWarning
                filters={filters ?? {}}
                nFilters={nFilters}
            />
            <Button
                style={{ margin: 6 }}
                disabled={nFilters === 0}
                onClick={() => clearFilters()}
            >
                Clear Filters
            </Button>
        </div>
    )
}
export default FiltersBar