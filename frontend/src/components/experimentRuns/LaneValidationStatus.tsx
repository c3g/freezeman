import React from 'react'
import { ValidationStatus } from '../../modules/experimentRunLanes/models'
import { Space, Typography } from 'antd'
import { CheckOutlined, CloseOutlined, QuestionCircleOutlined, SyncOutlined } from '@ant-design/icons'

export interface LaneValidationStatusProps {
	validationStatus: ValidationStatus
	isValidationInProgress: boolean
}

function LaneValidationStatus({validationStatus, isValidationInProgress}: LaneValidationStatusProps) {
	switch (validationStatus) {
		case ValidationStatus.AVAILABLE: {
			// return 
			return (
				<Space>
					{isValidationInProgress ? <SyncOutlined spin/> : <QuestionCircleOutlined/>}
					<Typography.Text strong>Awaiting validation</Typography.Text>
				</Space>
			)
		}
		case ValidationStatus.PASSED: {
			return (
				<Space>
					{isValidationInProgress ? <SyncOutlined spin/> : <CheckOutlined style={{ color: 'green' }} />}
					<Typography.Text strong>Passed</Typography.Text>
				</Space>
			)
		}
		case ValidationStatus.FAILED: {
			return (
				<Space>
					{isValidationInProgress ? <SyncOutlined spin/> : <CloseOutlined style={{ color: 'red' }} />}
					<Typography.Text strong>Failed</Typography.Text>
				</Space>
			)
		}
	}
}

export default LaneValidationStatus
