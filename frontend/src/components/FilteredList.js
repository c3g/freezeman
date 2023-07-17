import { Button } from "antd";
import React, { useEffect, useState } from "react";

import ListPageContent from "./ListPageContent";
import PaginatedTable from "./PaginatedTable";
import FiltersWarning from "./filters/FiltersWarning";
import getFilterProps from "./filters/getFilterProps";
import getNFilters from "./filters/getNFilters";


const FilteredList = ({
  description,
  columns,
  filterID,
  filterKey,
  itemsByID,
  items,
  totalCount,
  isFetching,
  page,
  listFilter,
}) => {


  const initialFilter = {
    [filterKey]: {
      value: filterID
    }
  };

  const hasDefaultFilter = () => {
      return filters[filterKey] && filters[filterKey]["value"];
  }

  //Local filters and sorters
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState({});

  useEffect(() => {
    setFilters(initialFilter);
    // returned function will be called on component unmount
    return () => {
    }
  }, [filterID])

  useEffect(() => {
    if(hasDefaultFilter())
      listFilter({filters, sortBy});
    // returned function will be called on component unmount
    return () => {
    }
  }, [filters, sortBy])

  const setFilter = (name, value) => {
    setFilters({...filters,  [name] : {"value" : value }})
  }

  const clearFilters = () => {
    setFilters({...initialFilter});
  }

  const setSorter = (key, order) => {
    setSortBy({key: key, order: order })
  }

  //To hide the default filter
  const filtersForWarning = {...filters};
  delete filtersForWarning[filterKey];

  const nFilters = getNFilters(filters)
  const nFiltersForWarning = nFilters - 1

  //Avoid user seeing the previous list
  const itemsFiltered = isFetching ? [] : items;
  totalCount = isFetching ? 0 : totalCount;

  columns = columns.map(c => Object.assign(c, getFilterProps(
    c,
    description,
    filters,
    setFilter,
  )))

  return (
		<>
			<ListPageContent>
				<div className="filters-warning-bar">
					<FiltersWarning nFilters={nFiltersForWarning} filters={filtersForWarning} description={description} />
					<Button disabled={nFiltersForWarning === 0} onClick={clearFilters}>
						Clear Filters
					</Button>
				</div>
				<PaginatedTable
					columns={columns}
					items={itemsFiltered}
					itemsByID={itemsByID}
					rowKey="id"
					loading={isFetching}
					totalCount={totalCount}
					page={page}
					filters={filters}
					sortBy={sortBy}
					onLoad={listFilter}
					filterKey={filterKey}
					onChangeSort={setSorter}
				/>
			</ListPageContent>
		</>
  )
}

export default FilteredList;
