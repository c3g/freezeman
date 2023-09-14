import React from "react"

import UserTableActions from '../../modules/usersTable/actions'

import { useAppSelector } from "../../hooks"
import { User } from "../../models/frontend_models"
import { selectUsersByID, selectUsersTable } from "../../selectors"
import AddButton from "../AddButton"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import FiltersBar from "../filters/filtersBar/FiltersBar"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable"
import { useCanWrite } from "../pagedItemsTable/useCanWrite"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import { usePagedItemsActionsCallbacks } from '../pagedItemsTable/usePagedItemsActionCallbacks'
import { USER_COLUMN_DEFINITIONS, USER_FILTER_DEFINITIONS, USER_FILTER_KEYS } from "./UsersTableColumns"

const usersTableColumns = [
	USER_COLUMN_DEFINITIONS.ID,
	USER_COLUMN_DEFINITIONS.USERNAME,
	USER_COLUMN_DEFINITIONS.EMAIL,
	USER_COLUMN_DEFINITIONS.GROUPS,
	USER_COLUMN_DEFINITIONS.DATE_JOINED,
	USER_COLUMN_DEFINITIONS.STAFF,
	USER_COLUMN_DEFINITIONS.SUPERUSER,
	USER_COLUMN_DEFINITIONS.ACTIVE
]

function wrapUser(user: User) {
	return {user}
}

function UsersListContent() {

	const usersTableState = useAppSelector(selectUsersTable)
	const {filters} = usersTableState 
	const canAdd = useCanWrite()

	const usersTableActions = usePagedItemsActionsCallbacks(UserTableActions)

	const columns = useFilteredColumns(
						usersTableColumns,
						USER_FILTER_DEFINITIONS,
						USER_FILTER_KEYS,
						filters,
						usersTableActions.setFilterCallback,
						usersTableActions.setFilterOptionsCallback)

	const getDataObjectsByID = useItemsByIDToDataObjects(selectUsersByID, wrapUser)

	return (
		<>
			<AppPageHeader title="Users" extra={canAdd ? [<AddButton key="add" url="/users/add" />] : []} />
			<PageContent>
				<FiltersBar filters={filters} clearFilters={usersTableActions.clearFiltersCallback}/>
				<PagedItemsTable
					getDataObjectsByID={getDataObjectsByID}
					columns={columns}
					pagedItems={usersTableState}
					usingFilters={false}
					{...usersTableActions}
				></PagedItemsTable>
			</PageContent>
		</>
	)
}

export default UsersListContent