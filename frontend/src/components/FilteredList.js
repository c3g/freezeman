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
  isFetching,
  page,
  list,
  filters,
  setFilters,
  sortBy,
  setSortBy,
}) => {


  const initialFilter = {
    [filterKey]: {
      value: filterID
    }
  };

  const initialSorter = {
    key: undefined,
    order: undefined
  };

  useEffect(() => {
    setFilters(initialFilter);
    setSortBy(initialSorter);
    list({filters, sortBy});
    // returned function will be called on component unmount
    return () => {
    }
  }, [filterID])

  useEffect(() => {
    list({filters, sortBy});
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
  const totalCount = items ? items.length : 0;

  //Avoid user seeing the previous list
  const itemsFiltered = isFetching ? {} : itemsByID;

  columns = columns.map(c => Object.assign(c, getFilterProps(
    c,
    description,
    filters,
    setFilter,
  )))

  return <>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1rem' }}>
        <FiltersWarning
          nFilters={nFiltersForWarning}
          filters={filtersForWarning}
          description={description}
        />
        <Button
          style={{ margin: 6 }}
          disabled={nFiltersForWarning === 0}
          onClick={clearFilters}
        >
          Clear Filters
        </Button>
      </div>
      <PaginatedTable
        columns={columns}
        items={items}
        itemsByID={itemsFiltered}
        rowKey="id"
        loading={isFetching}
        totalCount={totalCount}
        page={page}
        filters={filters}
        sortBy={sortBy}
        onLoad={list}
        onChangeSort={setSorter}
      />
    </PageContent>
  </>;
}

export default FilteredList;
