import React from "react";
import {connect} from "react-redux";
import moment from "moment";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";


import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/users/actions";

import {USER_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import FiltersWarning from "../filters/FiltersWarning";

const getTableColumns = () => [
    {
      title: "Username",
      dataIndex: "username",
      sorter: true,
      render: (username, user) => <Link to={`/users/${user.id}`}>{username}</Link>,
    },
    {
      title: "Email",
      dataIndex: "email",
      sorter: true,
    },
    {
      title: "Groups",
      dataIndex: "groups",
      render: (groups = []) => groups.map(g => <Tag key={g.name}>{g.name}</Tag>)
    },
    {
      title: "Date Joined",
      dataIndex: "date_joined",
      sorter: true,
      render: date => moment(date).fromNow(),
    },
    {
      title: "Staff",
      dataIndex: "is_staff",
      sorter: true,
      render: value => value ? 'Yes' : 'No',
    },
    {
      title: "Superuser",
      dataIndex: "is_superuser",
      sorter: true,
      render: value => value ? 'Yes' : 'No',
    },
  ];


const mapStateToProps = state => ({
  usersByID: state.users.itemsByID,
  users: state.users.items,
  sortBy: state.users.sortBy,
  filters: state.users.filters,
  actions: state.userTemplateActions,
  page: state.users.page,
  totalCount: state.users.totalCount,
  isFetching: state.users.isFetching,
});

const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const UsersListContent = ({
  users,
  usersByID,
  sortBy,
  filters,
  isFetching,
  page,
  totalCount,
  listTable,
  setFilter,
  setFilterOption,
  clearFilters,
  setSortBy,
}) => {

  const columns = getTableColumns(usersByID)
    .map(c => Object.assign(c, getFilterProps(
      c,
      USER_FILTERS,
      filters,
      setFilter,
      setFilterOption
    )))

  const nFilters = Object.entries(filters).filter(e => e[1]).length

  return <>
    <AppPageHeader title="Users" />
    <PageContent>
      <div style={{ textAlign: 'right', marginBottom: '1em' }}>
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={USER_FILTERS}
        />
        <Button
          disabled={nFilters === 0}
          onClick={clearFilters}
        >
          Clear Filters
        </Button>
      </div>
      <PaginatedTable
        columns={columns}
        items={users}
        itemsByID={usersByID}
        loading={isFetching}
        totalCount={totalCount}
        page={page}
        filters={filters}
        sortBy={sortBy}
        onLoad={listTable}
        onChangeSort={setSortBy}
      />
    </PageContent>
  </>;
}

export default connect(mapStateToProps, actionCreators)(UsersListContent);
