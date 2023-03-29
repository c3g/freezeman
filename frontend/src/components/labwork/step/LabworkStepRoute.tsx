import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { useIDParam } from '../../../hooks/useIDParams'
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
	const stepID = useIDParam('stepID')
	const appInitialized = useAppSelector(selectAppInitialzed)
	const labworkStepsState = useAppSelector(selectLabworkStepsState)
	const protocolsByID = useAppSelector(selectProtocolsByID)
	const stepsByID = useAppSelector(selectStepsByID)
	const dispatch = useAppDispatch()

	const [step, setStep] = useState<Step>()
	const [protocol, setProtocol] = useState<Protocol>()
	const [labworkStepSamples, setLabworkStepSamples] = useState<LabworkStepSamples>()

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
		if(step && !protocol) {
			const foundProtocol = protocolsByID[step.protocol_id]
			if(foundProtocol) {
				setProtocol(foundProtocol)
			}
		}
	}, [step, protocolsByID, protocol])
	
	useEffect(() => {
		if(step && protocol) {
			const foundLabwork = labworkStepsState.steps[step.id]
			if(foundLabwork) {
				setLabworkStepSamples(foundLabwork)
			} else {
				dispatch(initSamplesAtStep(step.id))
			}
		}
	}, [step, protocol, labworkStepsState, dispatch])

	return (
		step && protocol && labworkStepSamples ?
			<LabworkStep protocol={protocol} step={step} stepSamples={labworkStepSamples}/>
		: 
			null
	)	
}

export default LabworkStepRoute
