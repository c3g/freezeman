import React from 'react'
import { Descriptions, Typography } from 'antd'
const { Title } = Typography

import TrackingFieldsContent from '../TrackingFieldsContent'

interface ProjectOverviewProps {
	project?: any
}

/**
 * Displays the properties of a project.
 * @param Props : ProjectOverviewProps
 * @returns
 */
const ProjectOverview = ({ project }: ProjectOverviewProps) => {
	const title = `Project ${project?.name ?? ''}`

	return (
		<>
			<Title level={2}>Overview</Title>
			<Descriptions bordered={true} size="small" column={4}>
				<Descriptions.Item label="Project" span={4}>
					{project?.name}
				</Descriptions.Item>
				<Descriptions.Item label="Principal Investigator" span={2}>
					{project?.principal_investigator}
				</Descriptions.Item>
				<Descriptions.Item label="Status" span={2}>
					{project?.status}
				</Descriptions.Item>
				<Descriptions.Item label="Requestor Name" span={2}>
					{project?.requestor_name}
				</Descriptions.Item>
				<Descriptions.Item label="Requestor Email" span={2}>
					{project?.requestor_email}
				</Descriptions.Item>
				<Descriptions.Item label="External ID" span={2}>
					{project?.external_id}
				</Descriptions.Item>
				<Descriptions.Item label="External Name" span={2}>
					{project?.external_name}
				</Descriptions.Item>
				<Descriptions.Item label="Targeted End Date" span={2}>
					{project?.targeted_end_date}
				</Descriptions.Item>
				<Descriptions.Item label="Comment" span={2}>
					{project?.comment}
				</Descriptions.Item>
			</Descriptions>
			<TrackingFieldsContent entity={project} />
		</>
	)
}

export default ProjectOverview
