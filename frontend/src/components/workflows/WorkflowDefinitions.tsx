import React from 'react'
import { Workflow } from '../../models/frontend_models'
import WorkflowCollapsableList from '../studies/WorkflowCollapsableList'
import { Space, Typography } from 'antd'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import PageContainer from '../PageContainer'
import { InfoCircleOutlined } from '@ant-design/icons'

export interface WorkflowDefinitionsProps {
	workflows: Workflow[]
}

function WorkflowDefintions({workflows}: WorkflowDefinitionsProps) {
	return (
		<PageContainer>
			<AppPageHeader title={'Workflow Definitions'}/>
			<PageContent>
				<Space>
					<InfoCircleOutlined/>
					<Typography.Text italic>The workflows supported by Freezeman are listed here. To use a workflow, you add a study to a project and select a workflow for the study.</Typography.Text>
				</Space>
				<WorkflowCollapsableList workflows={workflows} />
			</PageContent>
		</PageContainer>
	)
}

export default WorkflowDefintions