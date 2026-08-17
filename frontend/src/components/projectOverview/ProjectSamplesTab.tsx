import React, { useEffect, useState,useCallback } from 'react'

import { Empty, Table } from 'antd'
import { Link } from 'react-router-dom'
import { ExternalIDProjectSample, ExternalIDProjectSamplesSummary ,ProjectOverviewExportButtonData} from './types'

import api from '../../utils/api'
import { useAppDispatch } from '../../hooks'
import { useCreateCsvExportFunction } from './useCsvExport'
import ProjectOverviewExportButton from './ProjectOverviewExportButton'
import ExternalIDSamplesDashboard from './ExternalIDSamplesDashboard'


// Affiche les Samples associés au projet parent.

interface ProjectSamplesTabProps {
 	parentProjectId: number | null
	externalID: string
	isActive: boolean
}

const formatDate = (date?: string | null) =>
	date
		? new Date(date).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			})
		: ''

const sampleColumns = [
	{
    title: 'Biosample ID',
    dataIndex: 'biosample_id',
    key: 'biosample_id',
	},
	{
		title: 'Sample Id',
		dataIndex: 'id',
		key: 'id',
		render: (id: number) => <Link to={`/samples/${id}`}>{id}</Link>,
	},
	{
	title: 'Project IDs',
	dataIndex: 'project_ids',
	key: 'project_ids',
	render: (projectIDs: number[]) =>
		projectIDs.map((projectID, index) => (
			<React.Fragment key={projectID}>
				{index > 0 && ', '}
				<Link to={`/projects/${projectID}`}>
					{projectID}
				</Link>
			</React.Fragment>
		)),
	},
	{
	title: 'Project Names',
	dataIndex: 'project_names',
	key: 'project_names',
	render: (projectNames: string[]) =>	projectNames.join(', '),
	},
	{
		title: 'Name',
		dataIndex: 'name',
		key: 'name',
		render: (name: string, sample: ExternalIDProjectSample) => <Link to={`/samples/${sample.id}`}>{name}</Link>,
	},
	{
		title: 'Alias',
		dataIndex: 'alias',
		key: 'alias',
		render: (alias?: string | null) => alias ?? '',
	},
	{
    title: 'Container',
    dataIndex: 'container_barcode',
    key: 'container_barcode',
},
	{
		title: 'Individual',
		dataIndex: 'individual',
		key: 'individual',
		render: (individual?: string | null) => individual ?? '',
	},
	{
		title: 'Creation Date',
		dataIndex: 'creation_date',
		key: 'creation_date',
		render: formatDate,
	},
	{
		title: 'Collection Site',
		dataIndex: 'collection_site',
		key: 'collection_site',
		render: (site?: string | null) => site ?? '',
	},
	{
		title: 'Comment',
		dataIndex: 'comment',
		key: 'comment',
	},
	{
	title: 'Experimental Groups',
	dataIndex: 'experimental_groups',
	key: 'experimental_groups',
	render: (groups: string[]) => groups.join(', '),
	},
	{
	title: 'Volume (uL)',
	dataIndex: 'volume',
	key: 'volume',
	align: 'right' as const,
	render: (value: string) => Number(value).toFixed(3),
	},
	{
		title: 'Concentration',
		dataIndex: 'concentration',
		key: 'concentration',
		align: 'right' as const,
		render: (value: string | null) =>
			value !== null ? Number(value).toFixed(3) : '',
	},
	{
		title: 'Quantity',
		key: 'quantity',
		align: 'right' as const,
		render: (_: unknown, sample: ExternalIDProjectSample) =>
			sample.concentration !== null ? (
				Number(sample.volume) * Number(sample.concentration)
			).toFixed(1)
		: '',
	},
	{
		title: 'Review State',
		key: 'review_state',
		render: (_: unknown, sample: ExternalIDProjectSample) => {
			const flags = [sample.quality_flag, sample.quantity_flag, sample.identity_flag].filter((flag) => flag != null)

			if (flags.length === 0) return ''

			return flags.every(Boolean) ? 'Passed' : 'Review'
		},
	},
	{
		title: 'Last Process Id',
		dataIndex: 'last_process_id',
		key: 'last_process_id',
		render: (processId?: number | null) => (processId != null ? <Link to={`/processes/${processId}`}>{processId}</Link> : ''),
	},
	{
		title: 'Last Process Name',
		dataIndex: 'last_process_name',
		key: 'last_process_name',
	},
	{
		title: 'Last Process Execution Date',
		dataIndex: 'last_process_execution_date',
		key: 'last_process_execution_date',
		render: formatDate,
	},
]

const ProjectSamplesTab = ({ parentProjectId, externalID, isActive }:ProjectSamplesTabProps) => {
	const [samples, setSamples] = useState<ExternalIDProjectSample[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const dispatch = useAppDispatch()

	// Charge les Samples associés au projet parent.
	const fetchSamplesByParentProjectID = useCallback(
		async ( parentProjectId: number,): Promise<ExternalIDProjectSample[]> => {
			const response = await dispatch(
				api.parentProjects.samples(
					parentProjectId,
						{
							limit: 100000,
						},
						true,
				),
			)	
		return response.data.results
	},[dispatch],
	)


	// Charge les Samples du projet parent et met à jour le composant.
	const loadParentProjectSamples = useCallback(async (
		parentProjectId: number,): Promise<void> => {
			try {
				setIsLoading(true)
				setError(null)

				const fetchedSamples =
					await fetchSamplesByParentProjectID(parentProjectId,)

				setSamples(fetchedSamples)
			} catch (error) {
				setSamples([])
				setError(
					error instanceof Error
						? error.message
						: 'Failed to fetch samples',
				)
			} finally {
				setIsLoading(false)
			}
		},
		[fetchSamplesByParentProjectID],
	)

	useEffect(() => {
		if (!isActive) { return}

		if (parentProjectId === null) {
			setSamples([])
			setError('Invalid parent project ID')
			return
		}

		loadParentProjectSamples(parentProjectId,)
	}, [isActive,parentProjectId,loadParentProjectSamples,])

	const generateCsvContent = useCreateCsvExportFunction(samples)

	if (error) {
		return <Empty description={error} />
	}

	const samplesWithConcentration = samples.filter(
    (sample) => sample.concentration != null)

	const avgConcentration =  samplesWithConcentration.length === 0 ? null : samplesWithConcentration.reduce(
		(sum, sample) => sum + Number(sample.concentration), 0,) / samplesWithConcentration.length


	const summary: ExternalIDProjectSamplesSummary = {
		total_samples: samples.length,

		qc_passed_count: samples.filter((s) => s.quality_flag === true).length,
		qc_review_count: samples.filter((s) => s.quality_flag === false).length,
		missing_qc_count: samples.filter((s) => s.quality_flag == null).length,

		samples_with_assigned_process_count: samples.filter((s) => s.last_process_id != null).length,
		samples_without_assigned_process_count: samples.filter((s) => s.last_process_id == null).length,
		samples_assigned_to_a_process_rate:	samples.length === 0 ? 0 : (
				samples.filter((sample) => sample.last_process_id != null,).length / samples.length
				) * 100,

		total_quantity: samples.reduce((sum, sample) => {
							const quantity = sample.volume != null && sample.concentration != null ? Number(sample.volume) * Number(sample.concentration) : 0
							return sum + quantity
						}, 0),
		avg_concentration: avgConcentration,	
		internal_projects_count: new Set(samples.flatMap((sample) => sample.project_ids),).size,
		experimental_groups_count: new Set(samples.flatMap((sample) => sample.experimental_groups),).size,
	}


		const exportButtonData: ProjectOverviewExportButtonData = {
			exportType: 'Project Samples',
			exportFunction: generateCsvContent,
			filename: 'Project Samples',
			itemsCount: samples.length,
			disabled: samples.length === 0,
		}


	return (
		<>
		{!isLoading && samples.length > 0 && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
					<ProjectOverviewExportButton data={exportButtonData} />
				</div>
			)}
			{!isLoading && isActive && <ExternalIDSamplesDashboard summary={summary} />}
					


			{samples.length > 0 ? (
			<Table
				style={{ fontSize: 10 }}
				size="small"
				bordered
				rowKey="id"
				dataSource={samples}
				columns={sampleColumns}
				loading={isLoading}
				scroll={{ y: 'calc(100vh - 260px)', x: 'max-content' }}
				pagination={{
					pageSize: 10,
					showSizeChanger: true,
					pageSizeOptions: ['20', '50', '100'],
					showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
				}}
			/>
			) : (
				<div>No samples found for External ID: {externalID}</div>
			)}
		</>
	)
}

export default ProjectSamplesTab
