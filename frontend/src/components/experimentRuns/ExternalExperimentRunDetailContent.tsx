import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectExternalExperimentRunsState } from '../../selectors'
import { ExternalExperimentRun } from '../../models/frontend_models'
import { loadExternalExperimentRuns } from '../../modules/experimentRuns/externalExperimentsActions'
import AppPageHeader from '../AppPageHeader'
import { Tabs, Typography } from 'antd'
import PageContent from '../PageContent'
import useHashURL from '../../hooks/useHashURL'
import ExperimentRunValidation from './ExperimentRunValidation'
import DatasetTable from '../datasets/DatasetTable'
const { Title } = Typography
const { TabPane} = Tabs


function ExternalExperimentRunDetailContentRoute() {
	const dispatch = useAppDispatch()
	const {name} = useParams()
	const state = useAppSelector(selectExternalExperimentRunsState)
	const [experimentRun, setExperimentRun] = useState<ExternalExperimentRun>()
	const [fetched, setFetched] = useState<boolean>(false)

	useEffect(() => {
		if (!experimentRun) {
			if (name) {
				const experiment = state.runs.find(run => run.run_name === name)
				if (experiment) {
					setExperimentRun(experiment)
				} else {
					// Load all of the external experiment runs, since we can't fetch just one.
					if (!fetched) {
						setFetched(true)
						dispatch(loadExternalExperimentRuns())
					}
				}
			}
		}
	}, [dispatch, state, experimentRun, name, fetched])


	if (experimentRun) {
		return <ExternalExperimentRunDetailContent externalExperimentRun={experimentRun}/>
	}
	return null
}

interface ExternalExperimentRunDetailContentProps {
	externalExperimentRun: ExternalExperimentRun
}

function ExternalExperimentRunDetailContent({externalExperimentRun}: ExternalExperimentRunDetailContentProps) {

	const VALIDATION_TAB_KEY = 'validation'
	const DATASETS_TAB_KEY = 'datasets'
	const [activeKey, setActiveKey] = useHashURL(VALIDATION_TAB_KEY)


	const date = new Date(externalExperimentRun.latest_submission_timestamp)

	const tabsStyle = {
		marginTop: 8,
	}
	
	const tabStyle = {
		padding: '0 24px 24px 24px',
		overflow: 'auto',
		height: '100%',
	}

	return (<>
		<AppPageHeader title={`External Experiment ${externalExperimentRun.run_name}`} extra={
			<Title level={5}>{date.toLocaleDateString('en-us', {
				year: 'numeric', month: 'short', day: 'numeric',
				hour: 'numeric', minute: 'numeric'
			})}</Title>
		}/>
		<PageContent tabs={true}>
			<Tabs defaultActiveKey='validation' onChange={setActiveKey} activeKey={activeKey} type='card' size= 'large' style={tabsStyle}>
				<TabPane tab='Validation' key={VALIDATION_TAB_KEY} style={tabStyle}>
					<ExperimentRunValidation experimentRunName={externalExperimentRun.run_name}/>
				</TabPane>
				<TabPane tab='Datasets' key={DATASETS_TAB_KEY} style={tabStyle}>
					<DatasetTable run_name={externalExperimentRun.run_name}/>
				</TabPane>
			</Tabs>
		</PageContent>
	</>)
}

export default ExternalExperimentRunDetailContentRoute