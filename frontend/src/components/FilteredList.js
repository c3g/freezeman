import React, {useEffect, useState} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import PageContent from "./PageContent";
import PaginatedTable from "./PaginatedTable";
import FiltersWarning from "./filters/FiltersWarning";
import getNFilters from "./filters/getNFilters";
import getFilterProps from "./filters/getFilterProps";


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
  expandable = undefined
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

  return <>
    <PageContent>
      <div className='filters-warning-bar'>
        <FiltersWarning
          nFilters={nFiltersForWarning}
          filters={filtersForWarning}
          description={description}
        />
        <Button
          disabled={nFiltersForWarning === 0}
          onClick={clearFilters}
        >
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
        expandable={expandable}
      />
    </PageContent>
  </>;
}

export default FilteredList;
