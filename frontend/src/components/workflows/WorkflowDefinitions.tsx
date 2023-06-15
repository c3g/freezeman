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
				<Space style={{marginBottom: '1em'}}>
					<InfoCircleOutlined/>
					<Typography.Text italic>This reference lists the workflows supported by Freezeman.</Typography.Text>
				</Space>
				<WorkflowCollapsableList workflows={workflows} />
			</PageContent>
		</PageContainer>
	)
}

export default WorkflowDefintions