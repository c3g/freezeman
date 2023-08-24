import React from 'react'
import { Link } from 'react-router-dom'
import { FILTER_TYPE } from '../../constants'
import { Container } from "../../models/frontend_models"
import { FilterDescription } from '../../models/paged_items'
import { selectContainerKindsByID } from '../../selectors'
import store from '../../store'
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns"
import { UNDEFINED_FILTER_KEY } from '../pagedItemsTable/PagedItemsFilters'
import { WithContainerRenderComponent, WithCoordinateRenderComponent, WithSampleRenderComponent } from '../shared/WithItemRenderComponent'


/**
 * Defines the set of filters that can be applied to sample columns.
 *
 * The object keys in the set map to the 'columnID' property of the column definition.
 *
 * Filter keys are defined separately, as they change depending on which endpoint
 * is being used to retrieve samples.
 */

// Initializes the sample KIND options with the sample kinds in the redux store.
function getContainerKindOptions() {
	const containerKinds = selectContainerKindsByID(store.getState())
	if (containerKinds) {
		const options = Object.keys(containerKinds).map((containerKind) => {
			return {
				label: containerKind,
				value: containerKind
			}
		})
		return options
	}return []
}

export interface ObjectWithContainer {
	container: Container
}

export type ContainerColumn = IdentifiedTableColumnType<ObjectWithContainer>

export enum ContainerColumnID {
	ID = 'ID',
	NAME = 'NAME',
	BARCODE = 'BARCODE',
	SAMPLES = 'SAMPLES',
	KIND = 'KIND',
	LOCATION = 'LOCATION',
	CHILDREN = 'CHILDREN',
	COORDINATE = 'COORDINATE',
}

const CONTAINER_KIND_SHOW_SAMPLE = ["tube"]

export const CONTAINER_COLUMN_DEFINITIONS : {[key in ContainerColumnID] : ContainerColumn} = {
	[ContainerColumnID.ID]: {
		columnID: ContainerColumnID.ID,
		title: 'ID',
		dataIndex: ['container', 'id'],
		sorter: true,
		render: (_, {container}) => {
			return container && <Link to={`/containers/${container.id}`}>{container.id}</Link>
		}
	},
	[ContainerColumnID.NAME] : {
		columnID: ContainerColumnID.NAME,
		title: 'Name',
		dataIndex: ['container', 'name'],
		sorter: true
	},
	[ContainerColumnID.BARCODE]: {
		columnID: ContainerColumnID.BARCODE,
		title: 'Barcode',
		dataIndex: ['container', 'barcode'],
		sorter: true,
		render: (_, {container}) => {
			return container && <Link to={`/containers/${container.id}`}>{container.barcode}</Link>
		}
	},
	[ContainerColumnID.SAMPLES]: {
		columnID: ContainerColumnID.SAMPLES,
		title: 'Sample(s)',
		dataIndex: ['container', 'samples'],
		render: (samples, {container}) => {
			return (
				// If the container is a tube, display a link to the sample in the tube.
				CONTAINER_KIND_SHOW_SAMPLE.includes(container.kind) && samples.length > 0 &&
				<>
				{samples.map((id, i) =>
					<React.Fragment key={id}>
					<Link to={`/samples/${id}`}>
						<WithSampleRenderComponent objectID={id} placeholder={<span>Loading...</span>} render={sample => <span>{sample.name}</span>}/>
					</Link>
					{i !== samples.length - 1 ? ', ' : ''}
					</React.Fragment>
				)}
				</>
			)
		}
	},
	[ContainerColumnID.KIND]: {
		columnID: ContainerColumnID.KIND,
		title: 'Kind',
		dataIndex: ['container', 'kind'],
		sorter: true,
	},
	[ContainerColumnID.LOCATION]: {
		columnID: ContainerColumnID.LOCATION,
		title: 'Location',
		dataIndex: ['container', 'location'],
		sorter: true,
		render: location => (location &&
			<Link to={`/containers/${location}`}>
			  <WithContainerRenderComponent objectID={location} placeholder={"Loading..."} render={container => <span>{container.name}</span>}/>
			</Link>),
	},
	[ContainerColumnID.COORDINATE]: {
		columnID: ContainerColumnID.COORDINATE,
		title: 'Coord.',
		dataIndex: ['container', 'coordinate'],
		sorter: true,
		render: (_, {container}) => 
			container.coordinate && 
				<WithCoordinateRenderComponent 
					objectID={container.coordinate} 
					placeholder={"loading..."} 
					render={coordinate => <span>{coordinate.name}</span>}/>
    
	},
	[ContainerColumnID.CHILDREN]: {
		columnID: ContainerColumnID.CHILDREN,
		title: 'Children',
		dataIndex: ['container', 'children'],
		render: children => children ? children.length : null
	},
}

// Define separate keys for filters, since not all columns have filters, and
// we need extra filters for "advanced search" filter fields.
export enum ContainerFilterID {
	ID = ContainerColumnID.ID,
	NAME = ContainerColumnID.NAME,
	BARCODE = ContainerColumnID.BARCODE,
	SAMPLES = ContainerColumnID.SAMPLES,
	KIND = ContainerColumnID.KIND,
	LOCATION = ContainerColumnID.LOCATION,
	COORDINATE = ContainerColumnID.COORDINATE,
	COMMENT = 'COMMENT'
}

export const CONTAINER_COLUMN_FILTERS: { [key in ContainerFilterID]: FilterDescription } = {
	[ContainerFilterID.ID]: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key:UNDEFINED_FILTER_KEY,
		label: "id",
	},
	[ContainerFilterID.NAME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: "Name",
		batch: true,
	},
	[ContainerFilterID.BARCODE]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: "Barcode",
		batch: true,
	},
	[ContainerFilterID.SAMPLES]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: "Sample name",
	},
	[ContainerFilterID.KIND]: {
		type: FILTER_TYPE.SELECT,
		key: UNDEFINED_FILTER_KEY,
		label: "Kind",
		mode: "multiple",
		placeholder: "All",
		dynamicOptions: getContainerKindOptions
	},
	[ContainerFilterID.LOCATION]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: "Location",
		recursive: true,
	},
	[ContainerFilterID.COORDINATE]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: "Coordinates",
	},
	[ContainerFilterID.COMMENT]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Comment'
	}
}

export const CONTAINER_FILTER_KEYS: {[key in ContainerFilterID] : string } = {
	[ContainerFilterID.ID]: 'id',
	[ContainerFilterID.NAME]: 'name',
	[ContainerFilterID.BARCODE]: 'barcode',
	[ContainerFilterID.SAMPLES]: 'samples__name',
	[ContainerFilterID.KIND]: 'kind',
	[ContainerFilterID.COMMENT]: 'comment',
	[ContainerFilterID.COORDINATE]: 'coordinate__name',
	[ContainerFilterID.LOCATION]: 'location__name',
}