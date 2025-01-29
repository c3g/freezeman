import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'
import { FMSId, FMSSampleNextStepByStudy, FMSStudy, WorkflowStepOrder } from './models/fms_api_models'
import { ReactElement, useCallback, useEffect, useState } from 'react'
import { SampleAndLibrary } from './components/WorkflowSamplesTable/ColumnSets'
import { fetchSamplesAndLibraries } from './modules/studySamples/services'
import { Protocol, Sample } from './models/frontend_models'
import api from './utils/api'
import React from 'react'
import { Popover, Spin, Tag } from 'antd'
import { fetchStudies } from './modules/cache/cache'

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export function useSampleAndLibraryList(sampleIDs: FMSId[], offset?: number, pageSize?: number) {
	const [isFetching, setIsFetching] = useState(false)
    const endIndex = pageSize !== undefined ? (offset ?? 0) + pageSize : undefined
    const [availableSamples, setAvailableSamples] = useState<SampleAndLibrary[]>([])

	useEffect(() => {
		(async () => {
			setIsFetching(true)
			setAvailableSamples(await fetchSamplesAndLibraries(sampleIDs.slice(offset, endIndex)))
			setIsFetching(false)
		})()
	}, [sampleIDs, offset, endIndex, pageSize])

	return [availableSamples, isFetching] as const
}

export function useLastProtocols(sampleIDs: readonly Sample['id'][]) {
    const dispatch = useAppDispatch()
    const [lastProtocolBySampleID, setLastProtocolBySampleID] = useState<Record<Sample['id'], Protocol['name']>>({})

    useEffect(() => {
        if (sampleIDs.length > 0) {
            dispatch(api.protocols.lastProtocols({ samples: sampleIDs.join(",") })).then(response => {
                setLastProtocolBySampleID(response.data.reduce((acc, { sample_result, protocol }) => {
                    acc[sample_result] = protocol
                    return acc
                }, {} as typeof lastProtocolBySampleID))
            })
        }
    }, [sampleIDs, dispatch])

    const LastProtocol = useCallback(({ sampleID }: { sampleID: Sample['id'] }) => {
        if (sampleID in lastProtocolBySampleID) {
            return <>{lastProtocolBySampleID[sampleID]}</>
        } else {
            return <></>
        }
    }, [lastProtocolBySampleID])

    return LastProtocol
}

export function useStudySteps(sampleIDs: readonly Sample['id'][]) {
    const dispatch = useAppDispatch()
    const [studiesByID, setStudiesByID] = useState<Record<FMSStudy['id'], FMSStudy['letter'] | undefined>>({})
    const [studyStepsBySampleID, setStudyStepsBySampleID] = useState<Record<Sample['id'], FMSSampleNextStepByStudy[] | undefined>>({})
    const [stepOrderByStepOrderID, setStepOrderByStepOrderID] = useState<Record<WorkflowStepOrder['id'], WorkflowStepOrder | undefined>>({})

    const refresh = useCallback(async (sampleIDs: readonly Sample['id'][]) => {
        const sampleNextStepByStudies = sampleIDs.length > 0
            ? (await dispatch(api.sampleNextStepByStudy.getStudySamples({ sample_next_step__sample__id__in: sampleIDs.join(",") }))).data.results
            : []

        const studyStepsBySampleID: Record<Sample['id'], FMSSampleNextStepByStudy[] | undefined> = {}
        for (const sampleNextStepByStudy of sampleNextStepByStudies) {
            let studySteps = studyStepsBySampleID[sampleNextStepByStudy.sample]
            if (!studySteps) {
                studySteps = []
            }
            if (!studySteps.find((s) => s.study === sampleNextStepByStudy.study && s.step_order === sampleNextStepByStudy.step_order && s.sample === sampleNextStepByStudy.sample)) {
                studySteps.push(sampleNextStepByStudy)
            }
            studyStepsBySampleID[sampleNextStepByStudy.sample] = studySteps
        }
        setStudyStepsBySampleID((old) => ({ ...old, ...studyStepsBySampleID }))

        const studyIDs = new Set<number>()
        for (const sampleID in studyStepsBySampleID) {
            for (const studyStep of studyStepsBySampleID[sampleID] ?? []) {
                studyIDs.add(studyStep.study)
            }
        }
        const studies: FMSStudy[] = []
        if (studyIDs.size > 0) {
            studies.push(...await fetchStudies(Array.from(studyIDs)))
        }
        const studiesByID: Record<FMSStudy['id'], FMSStudy['letter'] | undefined> = {}
        for (const study of studies) {
            studiesByID[study.id] = study.letter
        }
        setStudiesByID((old) => ({ ...old, ...studiesByID }) )

        const orderByStepOrder: Record<number, WorkflowStepOrder | undefined> = {}
        for (const study of studies) {
            if (study) {
                const workflow = (await dispatch(api.workflows.get(study.workflow_id))).data
                for (const stepOrder of workflow.steps_order) {
                    orderByStepOrder[stepOrder.id] = stepOrder
                }
            }
        }
        setStepOrderByStepOrderID((old) => ({ ...old, ...orderByStepOrder }))
    }, [dispatch])

    useEffect(() => {
        if (sampleIDs.length > 0) {
            refresh(sampleIDs)
        }
    }, [refresh, sampleIDs])

    const StudySteps = useCallback(({ sampleID, render = (studyStep, studyLetter, stepOrder) => {
            return <Popover
            key={studyStep.id}
            content={
                <>
                    <div>
                        Study: {studyLetter}
                    </div>
                    <div>
                        Step: {stepOrder.step_name}
                    </div>
                </>
            }
            destroyTooltipOnHide={{ keepParent: false }}
        >
            <Tag>{studyLetter}-{stepOrder.order}</Tag>
        </Popover>
    } }: { sampleID: Sample['id'], render?: (studyStep: FMSSampleNextStepByStudy, studyLetter: string, stepOrder: WorkflowStepOrder) => React.JSX.Element }) => {
        if (sampleID in studyStepsBySampleID) {
            const tags = studyStepsBySampleID[sampleID]
                ?.sort((a, b) => {
                    const ALetter = studiesByID[a.study]
                    const AStepOrder = stepOrderByStepOrderID[a.step_order]

                    const BLetter = studiesByID[b.study]
                    const BStepOrder = stepOrderByStepOrderID[b.step_order]

                    if (ALetter && AStepOrder && BLetter && BStepOrder) {
                        if (ALetter === BLetter) {
                            return AStepOrder.order - BStepOrder.order
                        } else {
                            return ALetter.localeCompare(BLetter)
                        }
                    } else {
                        return 0
                    }
                })
                ?.reduce<ReactElement[]>((tags, studyStep) => {
                    const studyLetter = studiesByID[studyStep.study]
                    const stepOrder = stepOrderByStepOrderID[studyStep.step_order]
                    if (studyLetter && stepOrder) {
                        tags.push(render(studyStep, studyLetter, stepOrder))
                    } else {
                        tags.push(<Spin key={studyStep.id} />)
                    }
                    return tags
                }, [])
                ?? [<></>]
            return tags
        } else {
            return [<></>]
        }
    }, [stepOrderByStepOrderID, studiesByID, studyStepsBySampleID])

    return [StudySteps, refresh] as const
}