import { Spin, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { Protocol, Step } from '../../../models/frontend_models'
import LABWORK_STEPS_ACTIONS from '../../../modules/labworkSteps/actions'
import { LabworkStepSamples } from '../../../modules/labworkSteps/models'
import { selectLabworkStepsState, selectLabworkSummaryState, selectProtocolsByID, selectStepsByID } from '../../../selectors'
import LabworkStep from './LabworkStep'

const { Title } = Typography

/* 
	LabworkStepRoute is responsible for loading all of the labwork step samples
	data. Once loaded, it renders a LabworkStep component to display the data.
*/
const LabworkStepRoute = (props: {}) => {
	const stepIDParam = useParams().stepID
	const labworkSummaryState = useAppSelector(selectLabworkSummaryState)
	const labworkStepsState = useAppSelector(selectLabworkStepsState)
	const protocolsByID = useAppSelector(selectProtocolsByID)
	const stepsByID = useAppSelector(selectStepsByID)
	const dispatch = useAppDispatch()

	const [step, setStep] = useState<Step>()
	const [protocol, setProtocol] = useState<Protocol>()
	const [labworkStepSamples, setLabworkStepSamples] = useState<LabworkStepSamples>()

	// Bail if the step ID is missing from the URL - there's a problem.
	if(!stepIDParam) {
		console.error(`stepID parameter is missing from step page url`)
		return null
	}
	const stepID = parseInt(stepIDParam)

	useEffect(() => {
		if(! step) {
			const foundStep = stepsByID[stepID]
			if(foundStep) {
				setStep(foundStep)
			}
		}
	}, [stepsByID])

	useEffect(() => {
		if(step && !protocol) {
			const foundProtocol = protocolsByID[step.protocol_id]
			if(foundProtocol) {
				setProtocol(foundProtocol)
			}
		}
	}, [step, protocolsByID])
	
	useEffect(() => {
		if(step && protocol) {
			const foundLabwork = labworkStepsState.steps[stepID]
			if(foundLabwork) {
				setLabworkStepSamples(foundLabwork)
			} else {
				dispatch(LABWORK_STEPS_ACTIONS.initSamplesAtStep(stepID))
			}
		}
	}, [step, protocol, labworkStepsState])

	return (
		step && protocol && labworkStepSamples &&
		<LabworkStep protocol={protocol} step={step} stepSamples={labworkStepSamples}/>
	)	
}

export default LabworkStepRoute
