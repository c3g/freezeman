import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { useIDParam } from '../../../hooks/useIDParams'
import { Protocol, Step } from '../../../models/frontend_models'
import { initSamplesAtStep } from '../../../modules/labworkSteps/actions'
import { selectAppInitialized, selectLabworkStepsState, selectProtocolsByID, selectStepsByID } from '../../../selectors'
import LabworkStep from './LabworkStep'

/* 
	LabworkStepRoute is responsible for loading all of the labwork step samples
	data. Once loaded, it renders a LabworkStep component to display the data.
*/


const LabworkStepRoute = () => {
	const stepID = useIDParam('stepID')
	const appInitialized = useAppSelector(selectAppInitialized)
	const labworkStepsState = useAppSelector(selectLabworkStepsState)
	const protocolsByID = useAppSelector(selectProtocolsByID)
	const stepsByID = useAppSelector(selectStepsByID)
	const dispatch = useAppDispatch()
	const labworkStepSamples = stepID ? labworkStepsState.steps[stepID] : undefined

	const [step, setStep] = useState<Step>()
	const [protocol, setProtocol] = useState<Protocol>()

	useEffect(() => {
		if (stepID && appInitialized) {
			if(! step) {
				const foundStep = stepsByID[stepID]
				if(foundStep) {
					setStep(foundStep)
				}
			}
		}
	}, [appInitialized, stepsByID, stepID, step])

	useEffect(() => {
		if(step && protocol === undefined) {
			const foundProtocol = protocolsByID[step.protocol_id]
			if(foundProtocol) {
				setProtocol(foundProtocol)
			}
		}
	}, [step, protocolsByID, protocol])
	
	useEffect(() => {
		if(step) {
			const foundLabwork = labworkStepsState.steps[step.id]
			if(!foundLabwork) {
				dispatch(initSamplesAtStep(step.id))
			}
		}
	}, [step, labworkStepsState, dispatch])

	return (
		step && labworkStepSamples ?
			<LabworkStep protocol={protocol} step={step} stepSamples={labworkStepSamples}/>
		: 
			null
	)	
}

export default LabworkStepRoute
