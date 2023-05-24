import { Tabs } from 'antd'
import React, { useCallback } from 'react'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import ExperimentRunsListContent from './ExperimentRunsListContent'
import ExternalExperimentRunsListContent from './ExternalExperimentRunsListContent'
import { ActionDropdown } from '../../utils/templateActions'
import ExportButton from '../ExportButton'
import useHashURL from '../../hooks/useHashURL'
import api, { withToken } from '../../utils/api'
import mergedListQueryParams from '../../utils/mergedListQueryParams'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectAuthTokenAccess, selectExperimentRunsState, selectExperimentRunsTemplateActions } from '../../selectors'
import { EXPERIMENT_RUN_FILTERS } from '../filters/descriptions'
import FiltersBar from '../filters/FiltersBar'
import { clearFilters } from '../../modules/experimentRuns/actions'

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

	const dispatch = useAppDispatch()
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

	const handleClearFilters = useCallback(() => {
		dispatch(clearFilters())
	}, [dispatch])

	function getTabBarExtraContent() {
		if (activeKey === FREEZEMAN_TAB_KEY) {
			return <FiltersBar filters={experimentRunsState.filters} clearFilters={handleClearFilters}></FiltersBar>
		} else {
			return null
		}
	}
	
	return (<>
			
		<AppPageHeader title='Experiment Runs'  extra={getPageHeaderExtra()}></AppPageHeader>
		<PageContent style={pageStyle}>
			<Tabs onChange={setActiveKey} type='card' tabBarExtraContent={getTabBarExtraContent()} style={tabsStyle}>
				<TabPane tab='Freezeman' key={FREEZEMAN_TAB_KEY} style={tabStyle}>
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