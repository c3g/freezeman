import { Tabs } from 'antd'
import React from 'react'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import ExperimentRunListContent from './ExperimentRunListContent'
import ExternalExperimentRunsListContent from './ExternalExperimentRunsListContent'
import { ActionDropdown } from '../../utils/templateActions'
import ExportButton from '../ExportButton'
import useHashURL from '../../hooks/useHashURL'
import api, { withToken } from '../../utils/api'
import mergedListQueryParams from '../../utils/mergedListQueryParams'
import { useAppSelector } from '../../hooks'
import { selectAuthTokenAccess, selectExperimentRunsTable, selectExperimentRunsTemplateActions } from '../../selectors'
import { EXPERIMENT_RUN_FILTERS } from '../filters/descriptions'

const pageStyle = {
	padding: 0,
	overflow: "auto",
}

const tabsStyle = {
	marginTop: 8,
}

const tabStyle = {
	padding: "0 24px 24px 24px",
	overflow: "auto",
	height: "100%",
}

export enum ExperimentRunsTabsName  {
    FREEZEMAN = 'freezeman',
	EXTERNAL = 'external',
}

function ExperimentRunsTabs() {
	const [activeKey, setActiveKey] = useHashURL(ExperimentRunsTabsName.FREEZEMAN)
	const token = useAppSelector(selectAuthTokenAccess)
	const experimentRunsTableState = useAppSelector(selectExperimentRunsTable)
	const actions = useAppSelector(selectExperimentRunsTemplateActions)


	function getPageHeaderExtra() {
		if (activeKey === ExperimentRunsTabsName.FREEZEMAN) {

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
			<Tabs onChange={setActiveKey} type='card' style={tabsStyle} items={[
				{
					key: ExperimentRunsTabsName.FREEZEMAN,
					label: 'FreezeMan',
					style: tabStyle,
					children: <ExperimentRunListContent/>
				},
				{
					key: ExperimentRunsTabsName.EXTERNAL,
					label: 'External',
					style: tabStyle,
					children: <ExternalExperimentRunsListContent/>
				}
			]} />
		</PageContent>

	</>)
}

export default ExperimentRunsTabs