import React, {useState, useRef} from "react";
import {connect, useDispatch } from "react-redux";
import prop from "prop-types";
import {Pagination, Table} from "antd";


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

function PaginatedTable ({
    columns,
    items,
    itemsByID,
    rowKey = 'id',
    loading,
    totalCount,
    filters,
    filterKey,
    sortBy,
    pageSize,
    onLoad,
    onChangeSort,
  }) {

  const dispatch  = useDispatch();
  const filtersRef = useRef(filters);
  const sortByRef = useRef(sortBy);
  const [currentPage, setCurrentPage] = useState(1);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex   = Math.min((currentPage) * pageSize, totalCount);

  const dataSource =
    items.slice(startIndex, endIndex)
      .map(id => itemsByID[id]);

  const hasUnloadedItems = dataSource.some(d => d === undefined);
  const isCurrentPageUnloaded = ((endIndex - 1) > items.length) || hasUnloadedItems;
  const shouldLoadNextChunk = !loading && isCurrentPageUnloaded;

  if (shouldLoadNextChunk) {
    const offset = Math.floor(startIndex / pageSize) * pageSize;
    setTimeout(() => onLoad({ offset, filters, sortBy, filterKey }), 0);
  }

  if (sortByRef.current !== sortBy) {
    setCurrentPage(1)
    sortByRef.current = sortBy
  }
  if (filtersRef.current !== filters) {
    setCurrentPage(1)
    filtersRef.current = filters
  }

  const onChangePage = (page) => {
    setCurrentPage(page);
  };

  const onChangeTable = (pagination, filters, sorter) => {
    const dataIndex = sorter.column?.dataIndex
    const key = dataIndex
    const order = sorter.order

    if (sortBy.key !== key || sortBy.order !== order)
      onChangeSort(key, order)
  };

  const onChangeSizeChange = (newPageSize) => {
    dispatch(setPageSize(newPageSize));
    onLoad({filters, sortBy, filterKey});
  };

  return (
    <>
      <Table
        size="small"
        bordered={true}
        pagination={false}
        columns={columns}
        dataSource={hasUnloadedItems ? [] : dataSource}
        rowKey={rowKey}
        loading={loading || isCurrentPageUnloaded}
        childrenColumnName={'UNEXISTENT_KEY'}
        onChange={onChangeTable}
        scroll={{ x: 300 }}
      />
      <Pagination
        className="ant-table-pagination ant-table-pagination-right"
        showSizeChanger={true}
        showQuickJumper={true}
        showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
        current={currentPage}
        pageSize={pageSize}
        total={totalCount}
        onChange={onChangePage}
        onShowSizeChange={(current, newPageSize) => onChangeSizeChange(newPageSize)}
      />
    </>
  );
}

PaginatedTable.propTypes = propTypes;

export default connect(mapStateToProps, actionCreators)(PaginatedTable);
