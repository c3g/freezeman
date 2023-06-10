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
    setTimeout(() => onLoad({ offset, filters, sortBy, filterKey, limit: pageSize }), 0);
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
  };

  return (
    <>
	{/* Put the table in an absolute positioned div. This stops the height and
		width of the table from determining the height and width of the page.
		
		This div uses flex to allocate the maximum vertical space to the table
		contents, while leaving the pagination section at the bottom of the box.
	*/}
	<div style={{
		position: 'absolute',
		display: 'flex',
		flexDirection: 'column',
		maxHeight: '100%',
		height: '100%',
		width: '100%',
		maxWidth: '100%'
	}}>
		{/* Have the table take up all available vertical space (flex 1)
			and have it scroll the table contents.

			The antd table supports vertical and horizontal scrolling, along
			with sticky headers, which would be perfect, but if we enable that
			then the table squishes itself horizontally to force the whole
			table to fit in the available width, and this makes the headers ugly.
		*/}
		<div style={{
			flex: '1',
			overflow: 'scroll',
			border: 'thin solid lightgray'
		}}>
			<Table
				size="small"
				bordered={false}
				pagination={false}
				columns={columns}
				dataSource={hasUnloadedItems ? [] : dataSource}
				rowKey={rowKey}
				loading={loading || isCurrentPageUnloaded}
				childrenColumnName={'UNEXISTENT_KEY'}
				onChange={onChangeTable}
			/>
		</div>
			
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
	</div>
    </>
  );
}

PaginatedTable.propTypes = propTypes;

export default connect(mapStateToProps, actionCreators)(PaginatedTable);
