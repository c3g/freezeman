import React from 'react'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import ExperimentRunListContent from './ExperimentRunListContent'
import { ActionDropdown } from '../../utils/templateActions'
import ExportButton from '../ExportButton'
import api, { withToken } from '../../utils/api'
import mergedListQueryParams from '../../utils/mergedListQueryParams'
import { useAppSelector } from '../../hooks'
import { selectAuthTokenAccess, selectExperimentRunsTable, selectExperimentRunsTemplateActions } from '../../selectors'
import { EXPERIMENT_RUN_FILTERS } from '../filters/descriptions'

const pageStyle = {
	padding: 0,
	overflow: "auto",
}

function ExperimentRunsListContentWithActions() {
	const token = useAppSelector(selectAuthTokenAccess)
	const experimentRunsTableState = useAppSelector(selectExperimentRunsTable)
	const actions = useAppSelector(selectExperimentRunsTemplateActions)


	function getPageHeaderExtra() {
    const listExport = () =>
      withToken(token, api.experimentRuns.listExport)(
        mergedListQueryParams(EXPERIMENT_RUN_FILTERS, experimentRunsTableState.filters, experimentRunsTableState.sortBy)
      )
      .then(response => response.data)


    return [
      <ActionDropdown key='actions' urlBase={"/experiment-runs"} actions={actions}/>,
      <ExportButton exportType={undefined} key='export' exportFunction={listExport} filename="experiments"  itemsCount={experimentRunsTableState.totalCount}/>,
    ]
	}

	return (<>

		<AppPageHeader title='Experiment Runs'  extra={getPageHeaderExtra()}></AppPageHeader>
		<PageContent style={pageStyle}>
      <ExperimentRunListContent/>
		</PageContent>

	</>)
}

export default ExperimentRunsListContentWithActions