import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'
import { FMSId } from './models/fms_api_models'
import { useCallback, useEffect, useState } from 'react'
import { SampleAndLibrary } from './components/WorkflowSamplesTable/ColumnSets'
import { fetchSamplesAndLibraries } from './modules/studySamples/services'
import { Protocol, Sample } from './models/frontend_models'
import api from './utils/api'
import React from 'react'

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
