import React from "react"
import { Link } from "react-router-dom"
import { User } from "../../models/frontend_models"
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns"
import { UNDEFINED_FILTER_KEY } from "../pagedItemsTable/PagedItemsFilters"
import { Tag } from "antd"
import moment from "moment";
import { useAppSelector } from "../../hooks"
import { selectGroupsByID } from "../../selectors"
import { FilterDescription } from "../../models/paged_items"
import { FILTER_TYPE } from "../../constants"

export interface ObjectWithUser {
	user: User
}

export type UserColumn = IdentifiedTableColumnType<ObjectWithUser>

enum UserColumnID {
	ID = 'ID',
	USERNAME = 'USERNAME',
	EMAIL = 'EMAIL',
	GROUPS = 'GROUPS',
	DATE_JOINED = 'DATE_JOINED',
	STAFF = 'STAFF',
	SUPERUSER = 'SUPERUSER',
	ACTIVE = 'ACTIVE'
}



// We need to define a component to display a user's list of groups
// since we need to get the groupsByID state to look up group names.
interface UserGroupListProps {
	groupIDs: (string | number)[]
}

function UserGroupList({groupIDs}: UserGroupListProps) {
	const groupsByID = useAppSelector(selectGroupsByID)
	return (
		<>
			{groupIDs.map(groupID => {
				const group = groupsByID[groupID]
				return group ?
					<Tag key={groupID}>{group.name}</Tag>
					:
					null
			})}
		</>
	)
}

export const USER_COLUMN_DEFINITIONS : {[key in UserColumnID] : Readonly<UserColumn>} = {
	[UserColumnID.ID]: {
		columnID: UserColumnID.ID,
		title: 'ID',
		dataIndex: ['user', 'id'],
		render: (_, {user}) => <Link to={`/users/${user.id}`}> <div>{user.id}</div> </Link>,
	},
	[UserColumnID.USERNAME]: {
		columnID: UserColumnID.USERNAME,
		title: 'Username',
		dataIndex: ['user', 'username'],
		render: (username, {user}) => <Link to={`/users/${user.id}`}>{username}</Link>,
	},
	[UserColumnID.EMAIL]: {
		columnID: UserColumnID.EMAIL,
		title: 'Email',
		dataIndex: ['user', 'email'],
	},
	[UserColumnID.GROUPS]: {
		columnID: UserColumnID.GROUPS,
		title: 'Groups',
		dataIndex: ['user', 'groups'],
		render: (groups = []) => <UserGroupList groupIDs={groups}/>
	},
	[UserColumnID.DATE_JOINED]: {
		columnID: UserColumnID.DATE_JOINED,
		title: 'Date Joined',
		dataIndex: ['user', 'date_joined'],
		render: date => moment(date).fromNow(),
	},
	[UserColumnID.STAFF]: {
		columnID: UserColumnID.STAFF,
		title: 'Staff',
		dataIndex: ['user', 'is_staff'],
		render: value => value ? 'Yes' : 'No',
	},
	[UserColumnID.SUPERUSER]: {
		columnID: UserColumnID.SUPERUSER,
		title: 'Superuser',
		dataIndex: ['user', 'is_superuser'],
		render: value => value ? 'Yes' : 'No',
	},
	[UserColumnID.ACTIVE]: {
		columnID: UserColumnID.ACTIVE,
		title: 'Active',
		dataIndex: ['user', 'is_active'],
		render: value => value ? 'Yes' : 'No',
	},
}

// Only a subset of columns has a filter definition
type UserFilterKeys = (UserColumnID.ID | UserColumnID.USERNAME | UserColumnID.EMAIL)

export const USER_FILTER_DEFINITIONS : {[key in UserFilterKeys]: FilterDescription} = {
	[UserColumnID.ID]: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key: UNDEFINED_FILTER_KEY,
		label: 'User ID'
	},
	[UserColumnID.USERNAME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Username'
	},
	[UserColumnID.EMAIL]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Email'
	},
}

export const USER_FILTER_KEYS: {[key in UserFilterKeys]: string} = {
	[UserColumnID.ID]: 'id',
	[UserColumnID.USERNAME]: 'username',
	[UserColumnID.EMAIL]: 'email'
}

