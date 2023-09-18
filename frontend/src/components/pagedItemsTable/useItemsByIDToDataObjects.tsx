import { useCallback } from 'react'
import { useAppSelector } from '../../hooks'
import { FMSTrackedModel } from '../../models/fms_api_models'
import { ItemsByID } from '../../models/frontend_models'
import { DataID } from '../../models/paged_items'
import { RootState } from '../../store'
import { DataObjectsByID } from './PagedItemsTable'


/**
 * This hook can be used for the getDataObjectsByID callback, if a simple selector
 * can be used to lookup the data items displayed in the table, such as projectByID
 * or samplesByID.
 * 
 * The hook returns a callback function that takes a list of item ID's as input
 * and outputs an object mapping the id's to data objects.
 * 
 * The transform function is used to convert from the data type stored in itemsByID
 * to the data type used in the table. Normally this is to transform something like a
 * project to an object containing a project, ie.
 * 
 * {
 * 	project: <some project>
 * }
 * 
 * This hook is intended for simple tables such as the samples, containers, individuals,
 * projects and libraries tables. For more complicated tables (such as workflow tables)
 * you should probably write your own custom function.
 * 
 * @param itemsByIDSelector 
 * @returns 
 */
export function useItemsByIDToDataObjects<T extends FMSTrackedModel, D>(
	itemsByIDSelector: (state: RootState) => ItemsByID<T>,
	transform: (item: T) => D
) {
	const itemsByID = useAppSelector(itemsByIDSelector)
	
	const callback = useCallback((ids: DataID[]) => {
		async function mapItemIDs(ids: DataID[]) : Promise<DataObjectsByID<D>> {
			return ids.reduce((acc, id) => {
				const item = itemsByID[id]
				if (item) {
					acc[id] = transform(item)
				}
				return acc
			}, {})
		}

		return mapItemIDs(ids)
	}, [itemsByID, transform])

	return callback
}