import React from 'react'
import { INDEX_COLUMN_DEFINITIONS, INDEX_FILTER_DEFINITIONS, INDEX_FILTER_KEYS } from "./InidicesTableColumns"
import IndicesTableActions from '../../modules/indicesTable/actions'
import { usePagedItemsActionsCallbacks } from '../pagedItemsTable/usePagedItemsActionCallbacks'
import { useFilteredColumns } from '../pagedItemsTable/useFilteredColumns'
import { selectIndicesByID, selectIndicesTable, selectIndicesTemplateActions } from '../../selectors'
import { useAppSelector } from '../../hooks'
import AppPageHeader from '../AppPageHeader'
import { Button } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { ActionDropdown } from '../../utils/templateActions'
import ExportButton from '../ExportButton'
import useListExportCallback from '../pagedItemsTable/useListExportCallback'
import api from '../../utils/api'
import PageContent from '../PageContent'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import PagedItemsTable from '../pagedItemsTable/PagedItemsTable'
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'

const TABLE_COLUMNS = [
	INDEX_COLUMN_DEFINITIONS.ID,
	INDEX_COLUMN_DEFINITIONS.INDEX_SET,
	INDEX_COLUMN_DEFINITIONS.INDEX_NAME,
	INDEX_COLUMN_DEFINITIONS.INDEX_STRUCTURE,
	INDEX_COLUMN_DEFINITIONS.SEQUENCE_3_PRIME,
	INDEX_COLUMN_DEFINITIONS.SEQUENCE_5_PRIME
]

function IndicesListContent() {
	const navigate = useNavigate()
	const pagedItems = useAppSelector(selectIndicesTable)
	const templateActions = useAppSelector(selectIndicesTemplateActions)
	const { filters, sortBy, totalCount } = pagedItems

	const listExport = useListExportCallback(api.indices.listExport, filters, sortBy)

	const pagedItemCallbacks = usePagedItemsActionsCallbacks(IndicesTableActions)

	const columns = useFilteredColumns(
						TABLE_COLUMNS,
						INDEX_FILTER_DEFINITIONS,
						INDEX_FILTER_KEYS,
						filters,
						pagedItemCallbacks.setFilterCallback,
						pagedItemCallbacks.setFilterOptionsCallback
	)

	const getDataObjectsByID = useItemsByIDToDataObjects(selectIndicesByID, index => { return {index} } )

	return <>
		<AppPageHeader title='Indices' extra={[
			<Button key='validate' onClick={() => navigate("/indices/validate")}>
				<CheckOutlined /> Validate Indices
			</Button>,
			<ActionDropdown key='actions' urlBase={"/indices"} actions={templateActions}/>,
			<ExportButton key='export' exportFunction={listExport} filename="indices" itemsCount={totalCount} exportType={''}/>,
		]}></AppPageHeader>
		<PageContent>
			<FiltersBar filters={filters} clearFilters={pagedItemCallbacks.clearFiltersCallback}/>
			<PagedItemsTable
				getDataObjectsByID={getDataObjectsByID}
				columns={columns}
				usingFilters={false}
				pagedItems={pagedItems}
				{...pagedItemCallbacks}
			/>
		</PageContent>
	</>
}

export default IndicesListContent