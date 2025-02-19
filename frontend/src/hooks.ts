import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'
import { FMSId } from './models/fms_api_models'
import { useEffect, useState } from 'react'
import { SampleAndLibrary } from './components/WorkflowSamplesTable/ColumnSets'
import { fetchSamplesAndLibraries } from './modules/studySamples/services'

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
