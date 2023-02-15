import { Typography } from 'antd'
import React from 'react'
import { useParams } from 'react-router-dom'
import { useAppSelector } from '../../../hooks'
import { findStepInSummary } from '../../../models/labwork_summary'
import { selectLabworkSummaryState } from '../../../selectors'
import LabworkStep from './LabworkStep'

const { Title } = Typography

// The page that lists the samples ready for processing by a given
// protocol and allows the user to select the samples and generate
// a prefilled template.

const LabworkStepRoute = (props: {}) => {
	const { stepID } = useParams()
	const labworkSummaryState = useAppSelector(selectLabworkSummaryState)

	if (!stepID || !labworkSummaryState.summary) {
		return null
	}

	// Find the protocol containing the step
	const result = findStepInSummary(labworkSummaryState.summary, parseInt(stepID))
	if (!result) {
		return null
	}

	return <LabworkStep protocol={result.protocol} step={result.step} />
}

export default LabworkStepRoute
