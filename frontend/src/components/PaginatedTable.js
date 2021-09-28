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
    page,
    filters,
    sortBy,
    pageSize,
    onLoad,
    onChangeSort,
  }) {

  const dispatch  = useDispatch();
  const filtersRef = useRef(filters);
  const sortByRef = useRef(sortBy);
  const [currentPage, setCurrentPage] = useState(1);
  const nextPage = currentPage + 1;
  const nextPageEndIndex = nextPage * pageSize;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex   = Math.min((currentPage) * pageSize, totalCount);

  const isLastPage = endIndex >= totalCount;

  const dataSource =
    items.slice(startIndex, endIndex)
      .map(id => itemsByID[id]);

  const hasUnloadedItems = dataSource.some(d => d === undefined);
  const isCurrentPageUnloaded = ((endIndex - 1) > items.length) || hasUnloadedItems;
  const doesNextPageContainUnloaded = !isLastPage && nextPageEndIndex > items.length && items.length < totalCount;
  const shouldLoadNextChunk =
    !loading && (isCurrentPageUnloaded || doesNextPageContainUnloaded);

  if (shouldLoadNextChunk) {
    let offset

    if (isCurrentPageUnloaded)
      offset = Math.floor(startIndex / page.limit) * page.limit;
    else if (doesNextPageContainUnloaded)
      offset = items.length;

    setTimeout(() => onLoad({ offset, filters, sortBy }), 0);
  }

  if (sortByRef.current !== sortBy) {
    setCurrentPage(1)
    sortByRef.current = sortBy
  }
  if (filtersRef.current !== filters) {
    setCurrentPage(1)
    filtersRef.current = filters
  }

  const onChangePage = (page, pageSize) => {
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
    onLoad({filters, sortBy});
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
