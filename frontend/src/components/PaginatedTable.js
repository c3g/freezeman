import React, {useState, useRef, useEffect} from "react";
import {connect, useDispatch } from "react-redux";
import prop from "prop-types";
import {Pagination, Table} from "antd";


import {setPageSize} from "../modules/pagination";
import PaginatedList from "./shared/PaginatedList";
import usePaginatedList from "../hooks/usePaginatedList";

const propTypes = {
 filters: prop.object.isRequired,
 sortBy: prop.object.isRequired,
 pageSize : prop.number.isRequired
};

const mapStateToProps = state => ({
  pageSize: state.pagination.pageSize,
});

const actionCreators = {setPageSize};

function PaginatedTable ({
    columns,
    items,
    itemsByID,
    rowKey = 'id',
    loading,
    totalCount,
    page,
    filters,
    filterKey,
    sortBy,
    pageSize,
    onLoad,
    onChangeSort,
  }) {
    const props = {
      columns,
      items,
      itemsByID,
      rowKey,
      loading,
      totalCount,
      page,
      filters,
      filterKey,
      sortBy,
      pageSize,
      onLoad,
      onChangeSort,
    }
    const pagintedListProps = usePaginatedList(props)
    return <PaginatedList {...pagintedListProps} />
}

PaginatedTable.propTypes = propTypes;

export default connect(mapStateToProps, actionCreators)(PaginatedTable);
