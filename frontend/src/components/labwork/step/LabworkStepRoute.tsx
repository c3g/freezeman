import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { Protocol, Step } from '../../../models/frontend_models'
import { initSamplesAtStep } from '../../../modules/labworkSteps/actions'
import { LabworkStepSamples } from '../../../modules/labworkSteps/models'
import { selectAppInitialzed, selectLabworkStepsState, selectProtocolsByID, selectStepsByID } from '../../../selectors'
import LabworkStep from './LabworkStep'


/* 
	LabworkStepRoute is responsible for loading all of the labwork step samples
	data. Once loaded, it renders a LabworkStep component to display the data.
*/
const LabworkStepRoute = () => {
	const stepIDParam = useParams().stepID
	const appInitialized = useAppSelector(selectAppInitialzed)
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
		if (appInitialized) {
			if(! step) {
				const foundStep = stepsByID[stepID]
				if(foundStep) {
					setStep(foundStep)
				}
			}
		}
	}, [appInitialized, stepsByID])

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
				dispatch(initSamplesAtStep(stepID))
			}
		}
	}, [step, protocol, labworkStepsState])

	return (
		step && protocol && labworkStepSamples ?
			<LabworkStep protocol={protocol} step={step} stepSamples={labworkStepSamples}/>
		: 
			null
	)	
}

export default LabworkStepRoute
