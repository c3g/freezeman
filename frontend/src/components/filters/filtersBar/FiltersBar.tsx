import React from "react";
import FiltersWarning from "./FiltersWarningTS";
import { Button } from "antd";
import { FilterSet } from "../../../models/paged_items";
import getNFilters from "../getNFilters";
export interface FiltersBarProps extends React.HTMLAttributes<HTMLDivElement> {
    filters: FilterSet,
    clearFilters: () => void
    buttonStyle?: React.CSSProperties
}
const FiltersBar = ({ filters, clearFilters, buttonStyle, ...props }: FiltersBarProps) => {

    const nFilters = getNFilters(filters ?? {})
    return (
        <div {...props} className='filters-warning-bar'>
            <FiltersWarning
                filters={filters ?? {}}
                nFilters={nFilters}
            />
            <Button
                style={{ margin: 6, ...buttonStyle }}
                disabled={nFilters === 0}
                onClick={() => clearFilters()}
            >
                Clear Filters
            </Button>
        </div>
    )
}
export default FiltersBar