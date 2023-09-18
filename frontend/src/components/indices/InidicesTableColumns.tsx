import { Link } from "react-router-dom"
import { Index } from "../../models/frontend_models"
import { FilterDescription } from "../../models/paged_items"
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns"
import React from "react"
import FixedLengthText from "../FixedLengthText"
import DropdownListItems from "../DropdownListItems"
import { WithSequenceRenderComponent } from "../shared/WithItemRenderComponent"
import { FILTER_TYPE } from "../../constants"
import { UNDEFINED_FILTER_KEY } from "../pagedItemsTable/PagedItemsFilters"

export interface ObjectWithIndex {
	index: Index
}

export type IndexColumn = IdentifiedTableColumnType<ObjectWithIndex>

enum IndexColumnID {
	ID = 'ID',
	INDEX_SET = 'INDEX_SET',
	INDEX_NAME = 'INDEX_NAME',
	INDEX_STRUCTURE = 'INDEX_STRUCTURE',
	SEQUENCE_3_PRIME = 'SEQUENCE_3_PRIME',
	SEQUENCE_5_PRIME = 'SEQUENCE_5_PRIME',
}

export const INDEX_COLUMN_DEFINITIONS : {[key in IndexColumnID]: Readonly<IndexColumn>} = {
	[IndexColumnID.ID]: {
		columnID: IndexColumnID.ID,
		title: 'ID',
		dataIndex: ['index', 'id'],
		render: (id, {index}) =>
        <Link to={`/indices/${index.id}`}>
          <div>{id}</div>
        </Link>,
	},
	[IndexColumnID.INDEX_NAME]: {
		columnID: IndexColumnID.INDEX_NAME,
		title: 'Index Name',
		dataIndex: ['index', 'name'],
		render: (name, {index}) =>
			<Link to={`/indices/${index.id}`}>
			<FixedLengthText text={name} fixedLength={50} />
			</Link>
	},
	[IndexColumnID.INDEX_SET]: {
		columnID: IndexColumnID.INDEX_SET,
		title: 'Index Set',
		dataIndex: ['index', 'index_set'],
		render: (_, {index}) => <FixedLengthText text={index.index_set} fixedLength={40} />,
	},
	[IndexColumnID.INDEX_STRUCTURE]: {
		columnID: IndexColumnID.INDEX_STRUCTURE,
		title: "Index Structure",
    	dataIndex: ['index', 'index_structure'],
		render: (_, {index}) => index.index_structure
	},
	[IndexColumnID.SEQUENCE_3_PRIME]: {
		columnID: IndexColumnID.SEQUENCE_3_PRIME,
		title: "Sequence 3 prime (i7)",
      	dataIndex: ['index', 'sequences_3prime'],
		  render: (_, {index}) => { return index && index.sequences_3prime &&
			<DropdownListItems listItems={index.sequences_3prime.map(sequence =>
			  sequence && <WithSequenceRenderComponent objectID={sequence} render={sequence => <>{sequence.value}</>} />)}
			/>
		  }
	},
	[IndexColumnID.SEQUENCE_5_PRIME]: {
		columnID: IndexColumnID.SEQUENCE_5_PRIME,
		title: "Sequence 5 prime (i5)",
      	dataIndex: ['index', 'sequences_5prime'],
		  render: (_, {index}) => { return index && index.sequences_5prime &&
			<DropdownListItems listItems={index.sequences_5prime.map(sequence =>
			  sequence && <WithSequenceRenderComponent objectID={sequence} render={sequence => <>{sequence.value}</>} />
			)}
			/>
		  }
	}
}

export const INDEX_FILTER_DEFINITIONS : {[key in IndexColumnID] : FilterDescription} = {
	[IndexColumnID.ID]: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key: UNDEFINED_FILTER_KEY,
		label: 'ID'
	},
	[IndexColumnID.INDEX_NAME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Index Name',
		batch: true,
	},
	[IndexColumnID.INDEX_SET]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Index Set',
		batch: true,
	},
	[IndexColumnID.INDEX_STRUCTURE]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Index Structure'
	},
	[IndexColumnID.SEQUENCE_3_PRIME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Sequence 3 prime'
	},
	[IndexColumnID.SEQUENCE_5_PRIME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Sequence 5 prime'
	}
}

export const INDEX_FILTER_KEYS : {[key in IndexColumnID] : string} = {
	[IndexColumnID.ID]: 'id',
	[IndexColumnID.INDEX_NAME]: 'name',
	[IndexColumnID.INDEX_SET]: 'index_set__name',
	[IndexColumnID.INDEX_STRUCTURE]: 'index_structure__name',
	[IndexColumnID.SEQUENCE_3_PRIME]: 'sequences_3prime__value',
	[IndexColumnID.SEQUENCE_5_PRIME]: 'sequences_5prime__value',
}