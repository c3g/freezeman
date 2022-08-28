import { useDispatch, useSelector } from "react-redux"
import React from "react";
import {connect} from "react-redux";
import moment from "moment";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import AddButton from "../AddButton";

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/users/actions";

import {USER_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import FiltersWarning from "../filters/FiltersWarning";
import canWrite from "./canWrite";

const getTableColumns = (groupsByID) => [
    {
      title: "ID",
      dataIndex: "id",
      sorter: true,
      render: (_, user) => <Link to={`/users/${user.id}`}> <div>{user.id}</div> </Link>,
    },
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
      render: (groups = []) => groups.map(g => <Tag key={g}>{groupsByID[g]?.name}</Tag>)
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
    {
      title: "Active",
      dataIndex: "is_active",
      sorter: true,
      render: value => value ? 'Yes' : 'No',
    },
  ];






const UsersListContent = ({  }) => {

  const canWrite = useSelector((state) => canWrite(state))
  const users = useSelector((state) => state.users.items)
  const usersByID = useSelector((state) => state.users.itemsByID)
  const groupsByID = useSelector((state) => state.groups.itemsByID)
  const sortBy = useSelector((state) => state.users.sortBy)
  const filters = useSelector((state) => state.users.filters)
  const actions = useSelector((state) => state.userTemplateActions)
  const page = useSelector((state) => state.users.page)
  const totalCount = useSelector((state) => state.users.totalCount)
  const isFetching = useSelector((state) => state.users.isFetching)
  const dispatch = useDispatch()
  const dispatchListTable = useCallback((...args) => listTable(...args), [dispatch])
  const dispatchSetFilter = useCallback((...args) => setFilter(...args), [dispatch])
  const dispatchSetFilterOption = useCallback((...args) => setFilterOption(...args), [dispatch])
  const dispatchClearFilters = useCallback((...args) => clearFilters(...args), [dispatch])
  const dispatchSetSortBy = useCallback((...args) => setSortBy(...args), [dispatch])

  const columns = getTableColumns(groupsByID)
    .map(c => Object.assign(c, getFilterProps(
      c,
      USER_FILTERS,
      filters,
      dispatchSetFilter,
      dispatchSetFilterOption
    )))

  const nFilters = Object.entries(filters).filter(e => e[1]).length

  return <>
    <AppPageHeader title="Users" extra={canWrite ? [
      <AddButton key='add' url="/users/add" />,
    ] : []}/>
    <PageContent>
      <div style={{ textAlign: 'right', marginBottom: '1em' }}>
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={USER_FILTERS}
        />
        <Button
          disabled={nFilters === 0}
          onClick={dispatchClearFilters}
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
        onLoad={dispatchListTable}
        onChangeSort={dispatchSetSortBy}
      />
    </PageContent>
  </>;
}

export default UsersListContent;
