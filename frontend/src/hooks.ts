import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'
import { FMSId } from './models/fms_api_models'
import { useEffect, useMemo, useState } from 'react'
import { fetchLibrariesForSamples, fetchSamples } from './modules/cache/cache'
import { selectLibrariesByID, selectSamplesByID } from './selectors'
import { SampleAndLibrary } from './components/WorkflowSamplesTable/ColumnSets'

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export function useSampleAndLibraryList(sampleIDs: FMSId[], offset?: number, pageSize?: number) {
	const [isFetching, setIsFetching] = useState(false)
    const endIndex = pageSize !== undefined ? (offset ?? 0) + pageSize : undefined

	useEffect(() => {
		(async () => {
			setIsFetching(true)
			const samples = await fetchSamples(sampleIDs.slice(offset, endIndex))
			const samplesWithLibraries = samples.filter((s) => s.is_library).map((s) => s.id)
			await fetchLibrariesForSamples(samplesWithLibraries)
			setIsFetching(false)
		})()
	}, [sampleIDs, offset, endIndex, pageSize])

	const samplesByID = useAppSelector(selectSamplesByID)
	const librariesByID = useAppSelector(selectLibrariesByID)

	const availableSamples = useMemo(() => sampleIDs.slice(offset, endIndex).reduce((acc, sampleID) => {
		const sample = samplesByID[sampleID]
		if (sample) {
			if (sample.is_library) {
				const library = librariesByID[sampleID]
				acc.push({ sample, library })
			} else {
				acc.push({ sample })
			}
		}
		return acc
	}, [] as SampleAndLibrary[]), [sampleIDs, samplesByID, librariesByID, offset, endIndex])

	return [availableSamples, isFetching] as const
}
