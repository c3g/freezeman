import { Descriptions, Tabs, Tag } from 'antd'
import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import useHashURL from '../../hooks/useHashURL'
import { Container, ExperimentRun, Process } from '../../models/frontend_models'
import { get as getContainer } from '../../modules/containers/actions'
import { get as getExperimentRun, listPropertyValues } from '../../modules/experimentRuns/actions'
import { get as getProcess, list as listProcesses } from '../../modules/processes/actions'
import {
  selectContainersByID,
  selectExperimentRunsByID,
  selectInstrumentsByID,
  selectProcessesByID,
  selectPropertyValuesByID,
  selectProtocolsByID,
  selectRunTypesByID,
} from '../../selectors'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import TrackingFieldsContent from '../TrackingFieldsContent'
import ProcessProperties from '../shared/ProcessProperties'
import { WithContainerRenderComponent } from '../shared/WithItemRenderComponent'
import ExperimentRunValidation from './ExperimentRunValidation'
import ExperimentRunsSamples from './ExperimentRunsSamples'
import ExperimentRunOverview from './ExperimentRunOverview'
import DatasetTable from '../datasets/DatasetTable'

const { TabPane } = Tabs

const pageStyle = {
	padding: 0,
	overflow: 'hidden',
}

const tabsStyle = {
	marginTop: 8,
}

const tabStyle = {
	padding: '0 24px 24px 24px',
	overflow: 'auto',
	height: '100%',
}

/*
  ExperimentRunsDetailContentRoute ensures that the experiment, container and process
  have been loaded before rendering the ExperimentRunsDetailContent component. This
  ensures that if the user reloads the page, they won't end up with a blank page due
  to unloaded data.
*/
export function ExperimentRunsDetailContentRoute() {
	const dispatch = useAppDispatch()
	const { id } = useParams()
	const experimentRunsByID = useAppSelector(selectExperimentRunsByID)
	const containersByID = useAppSelector(selectContainersByID)
	const processesByID = useAppSelector(selectProcessesByID)
	const propertyValuesByID = useAppSelector(selectPropertyValuesByID)

	const [experimentRun, setExperimentRun] = useState<ExperimentRun>()
	const [container, setContainer] = useState<Container>()
	const [process, setProcess] = useState<Process>()

	useEffect(() => {
		if (!id) {
			return
		}

		const experimentRun = experimentRunsByID[id]
		if (!experimentRun) {
			dispatch(getExperimentRun(id))
			return
		}

		if (experimentRun.isFetching) {
			return
		}

		setExperimentRun(experimentRun)

		const container = containersByID[experimentRun.container]
		if (!container) {
			dispatch(getContainer(experimentRun.container))
			return
		}

		if (container.isFetching) {
			return
		}

		setContainer(container)

		const process = processesByID[experimentRun.process]
		if (!process) {
			dispatch(getProcess(experimentRun.process))
			return
		}

		if (process.isFetching) {
			return
		}

		setProcess(process)

		const isChildrenAndPropertiesLoaded =
			process.children_properties.every((id) => propertyValuesByID[id]) &&
			experimentRun.children_processes.every((id) => {
				const process = processesByID[id]
				return process && process.children_properties.every((id) => propertyValuesByID[id])
			})

		if (!isChildrenAndPropertiesLoaded) {
			// Need to be queried as a string, not as an array in order to work with DRF filters
			const processIDSAsStr = [experimentRun.process].concat(experimentRun.children_processes).join()
			dispatch(listProcesses({ id__in: processIDSAsStr }))
			dispatch(listPropertyValues({ object_id__in: processIDSAsStr, content_type__model: 'process' }))
			return
		}
	}, [experimentRunsByID, containersByID, processesByID, propertyValuesByID, dispatch, id])

	if (experimentRun && container && process) {
		return <ExperimentRunsDetailContent experimentRun={experimentRun} container={container} process={process} />
	}
}

interface ExperimentRunsDetailContentProps {
	experimentRun: ExperimentRun
	container: Container
	process: Process
}

export function ExperimentRunsDetailContent({ experimentRun, container, process }: ExperimentRunsDetailContentProps) {
	const [activeKey, setActiveKey] = useHashURL('overview')

	const protocolsByID = useAppSelector(selectProtocolsByID)
	const processesByID = useAppSelector(selectProcessesByID)

	return (
		<>
			<AppPageHeader title={`Experiment ${experimentRun.id}`} />

			<PageContent loading={false} style={pageStyle} tabs={true}>
				<Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card" style={tabsStyle}>
					<TabPane tab="Overview" key="overview" style={tabStyle}>
						<ExperimentRunOverview experimentRun={experimentRun} container={container} process={process}/>
					</TabPane>

					<TabPane tab="Steps" key="steps" style={tabStyle}>
						<ProcessProperties
							propertyIDs={process.children_properties}
							protocolName={protocolsByID[processesByID[experimentRun.process]?.protocol]?.name}
						/>
						{experimentRun.children_processes?.map((id) => {
							const process = processesByID[id]
							return (
								process && (
									<>
										<ProcessProperties
											propertyIDs={process.children_properties}
											protocolName={protocolsByID[process.protocol]?.name}
										/>
									</>
								)
							)
						})}
					</TabPane>

					<TabPane tab={`Samples (${container ? container.samples.length : ''})`} key="samples" style={tabStyle}>
						<ExperimentRunsSamples container={container} experimentRun={experimentRun} />
					</TabPane>

					<TabPane tab={'Validation'} key="validation" style={tabStyle}>
						<ExperimentRunValidation experimentRunName={experimentRun.name} />
					</TabPane>

					<TabPane tab={'Datasets'} key="datasets" style={tabStyle}>
						<DatasetTable run_name={experimentRun.name}/>
					</TabPane>
				</Tabs>
			</PageContent>
		</>
	)
}
