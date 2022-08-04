import React, {useState, useRef} from "react";
import {connect, useDispatch } from "react-redux";
import prop from "prop-types";
import {Pagination, Table} from "antd";
import usePaginatedList from "../hooks/usePaginatedList"


import {setPageSize} from "../modules/pagination";

const propTypes = {
 filters: prop.object.isRequired,
 sortBy: prop.object.isRequired,
 pageSize : prop.number.isRequired
};

const mapStateToProps = state => ({
  pageSize: state.pagination.pageSize,
});

const actionCreators = {setPageSize};

function PaginatedTable (PaginatedTableProps = {
    columns,
    items,
    itemsByID,
    rowKey: 'id',
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
    const { tableProps, paginationProps } = usePaginatedList(PaginatedTableProps)

  return (
    <>
      <Table
        {...tableProps}
      />
      <Pagination
        {...paginationProps}
      />
    </>
  );
}

PaginatedTable.propTypes = propTypes;

export default connect(mapStateToProps, actionCreators)(PaginatedTable);
