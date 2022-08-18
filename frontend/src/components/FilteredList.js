import React, {useEffect, useState} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import PageContent from "./PageContent";
import PaginatedTable from "./PaginatedTable";
import FiltersWarning from "./filters/FiltersWarning";
import getNFilters from "./filters/getNFilters";
import getFilterProps from "./filters/getFilterProps";
import useFilteredList from "../hooks/useFilteredList";
import PaginatedList from "./shared/PaginatedList";


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
  const props = {
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
  }
  const pagintedListProps = useFilteredList(props)
  return <PaginatedList {...pagintedListProps} />
}

export default FilteredList;
