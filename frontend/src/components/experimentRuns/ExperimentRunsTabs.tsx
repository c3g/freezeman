import { Tabs } from 'antd'
import React, { useState } from 'react'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import ExperimentRunsListContent from './ExperimentRunsListContent'
import ExternalExperimentRunsListContent from './ExternalExperimentRunsListContent'
import { ActionDropdown } from '../../utils/templateActions'
import ExportButton from '../ExportButton'
import useHashURL from '../../hooks/useHashURL'
import api, { withToken } from '../../utils/api'
import mergedListQueryParams from '../../utils/mergedListQueryParams'
import { useAppSelector } from '../../hooks'
import { selectAuthTokenAccess, selectExperimentRunsState, selectExperimentRunsTemplateActions } from '../../selectors'
import { EXPERIMENT_RUN_FILTERS } from '../filters/descriptions'

const { TabPane } = Tabs

function ExperimentRunsTabs() {

	const FREEZEMAN_TAB_KEY = 'freezeman'
	const EXTERNAL_TAB_KEY = 'external'

	const [activeKey, setActiveKey] = useHashURL(FREEZEMAN_TAB_KEY)
	const token = useAppSelector(selectAuthTokenAccess)
	const experimentRunsState = useAppSelector(selectExperimentRunsState)
	const actions = useAppSelector(selectExperimentRunsTemplateActions)

	function getPageHeaderExtra() {
		if (activeKey === FREEZEMAN_TAB_KEY) {

			const listExport = () =>
				withToken(token, api.experimentRuns.listExport)
				(mergedListQueryParams(EXPERIMENT_RUN_FILTERS, experimentRunsState.filters, experimentRunsState.sortBy))
				.then(response => response.data)


			return [
				<ActionDropdown key='actions' urlBase={"/experiment-runs"} actions={actions}/>,
				<ExportButton key='export' exportFunction={listExport} filename="experiments"  itemsCount={experimentRunsState.totalCount}/>,
			]
		} else {
			return []
		}
	} 
	
	return (<>
			
		<AppPageHeader title='Experiment Runs'  extra={getPageHeaderExtra()}></AppPageHeader>
		<PageContent>
			<Tabs onChange={setActiveKey}>
				<TabPane tab='Freezeman' key={FREEZEMAN_TAB_KEY}>
					<ExperimentRunsListContent/>
				</TabPane>
				<TabPane tab='External' key={EXTERNAL_TAB_KEY}>
					<ExternalExperimentRunsListContent/>
				</TabPane>
			</Tabs>
		</PageContent>
	
	</>)
}

export default ExperimentRunsTabs