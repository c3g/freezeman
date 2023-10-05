import { Tabs } from 'antd'
import React from 'react'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import ExperimentRunsListContent from './ExperimentRunListContent2'
import ExternalExperimentRunsListContent from './ExternalExperimentRunsListContent'
import { ActionDropdown } from '../../utils/templateActions'
import ExportButton from '../ExportButton'
import useHashURL from '../../hooks/useHashURL'
import api, { withToken } from '../../utils/api'
import mergedListQueryParams from '../../utils/mergedListQueryParams'
import { useAppSelector } from '../../hooks'
import { selectAuthTokenAccess, selectExperimentRunsTable, selectExperimentRunsTemplateActions } from '../../selectors'
import { EXPERIMENT_RUN_FILTERS } from '../filters/descriptions'

const { TabPane } = Tabs

const pageStyle = {
	padding: 0,
	overflow: "hidden",
}

const tabsStyle = {
	marginTop: 8,
}

const tabStyle = {
	padding: "0 24px 24px 24px",
	overflow: "auto",
	height: "100%",
  }

function ExperimentRunsTabs() {

	const FREEZEMAN_TAB_KEY = 'freezeman'
	const EXTERNAL_TAB_KEY = 'external'

	const [activeKey, setActiveKey] = useHashURL(FREEZEMAN_TAB_KEY)
	const token = useAppSelector(selectAuthTokenAccess)
	const experimentRunsTableState = useAppSelector(selectExperimentRunsTable)
	const actions = useAppSelector(selectExperimentRunsTemplateActions)


	function getPageHeaderExtra() {
		if (activeKey === FREEZEMAN_TAB_KEY) {

			const listExport = () =>
				withToken(token, api.experimentRuns.listExport)(
					mergedListQueryParams(EXPERIMENT_RUN_FILTERS, experimentRunsTableState.filters, experimentRunsTableState.sortBy)
				)
				.then(response => response.data)


			return [
				<ActionDropdown key='actions' urlBase={"/experiment-runs"} actions={actions}/>,
				<ExportButton exportType={undefined} key='export' exportFunction={listExport} filename="experiments"  itemsCount={experimentRunsTableState.totalCount}/>,
			]
		} else {
			return []
		}
	}
	
	return (<>
			
		<AppPageHeader title='Experiment Runs'  extra={getPageHeaderExtra()}></AppPageHeader>
		<PageContent style={pageStyle}>
			<Tabs onChange={setActiveKey} type='card' style={tabsStyle}>
				<TabPane tab='FreezeMan' key={FREEZEMAN_TAB_KEY} style={tabStyle}>
					<ExperimentRunsListContent/>
				</TabPane>
				<TabPane tab='External' key={EXTERNAL_TAB_KEY}  style={tabStyle}>
					<ExternalExperimentRunsListContent/>
				</TabPane>
			</Tabs>
		</PageContent>
	
	</>)
}

export default ExperimentRunsTabs