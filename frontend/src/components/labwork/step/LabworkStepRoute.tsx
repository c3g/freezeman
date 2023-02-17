import { Typography } from 'antd'
import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { findStepInSummary, LabworkSummaryProtocol, LabworkSummaryStep } from '../../../models/labwork_summary'
import { LabworkStepSamples } from '../../../modules/labworkSteps/models'
import { selectLabworkStepsState, selectLabworkSummaryState, selectProtocolsByID } from '../../../selectors'
import LabworkStep from './LabworkStep'
import LABWORK_STEPS_ACTIONS from '../../../modules/labworkSteps/actions'
import { FMSId } from '../../../models/fms_api_models'
import { Protocol } from '../../../models/frontend_models'

const { Title } = Typography

// The page that lists the samples ready for processing by a given
// protocol and allows the user to select the samples and generate
// a prefilled template.

const LabworkStepRoute = (props: {}) => {
	const stepIDParam = useParams().stepID
	const labworkSummaryState = useAppSelector(selectLabworkSummaryState)
	const labworkStepsState = useAppSelector(selectLabworkStepsState)
	const protocolsByID = useAppSelector(selectProtocolsByID)
	const dispatch = useAppDispatch()

	let stepID: FMSId | undefined
	let step: LabworkSummaryStep | undefined
	let protocol: Protocol | undefined
	let labworkStepSamples: LabworkStepSamples | undefined

	if (stepIDParam) {
		stepID = parseInt(stepIDParam)
		if (labworkSummaryState.summary) {
			// Find the protocol containing the step
			const result = findStepInSummary(labworkSummaryState.summary, stepID)
			if (result) {
				step = result.step
				protocol = protocolsByID[result.protocol.id]
			}
		}
	}

	if (stepID) {
		labworkStepSamples = labworkStepsState.steps[stepID]
	}
	
	useEffect(() => {
		if (stepID && !labworkStepSamples) {
			dispatch(LABWORK_STEPS_ACTIONS.loadSamplesAtStep(stepID, 1))
		}
	}, [labworkStepsState])

	return (
		stepID && labworkSummaryState && step && protocol && labworkStepSamples &&
		<LabworkStep protocol={protocol} step={step} stepSamples={labworkStepSamples} loading={labworkSummaryState.isFetching}/>
	)	
}

export default LabworkStepRoute
