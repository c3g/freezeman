import React from 'react'
import { Link } from 'react-router-dom'
import { Individual, getAllItems } from '../../models/frontend_models'
import { IdentifiedTableColumnType } from '../pagedItemsTable/PagedItemsColumns'
import { WithTaxonRenderComponent } from '../shared/WithItemRenderComponent'
import { FilterDescription } from '../../models/paged_items'
import { UNDEFINED_FILTER_KEY } from '../pagedItemsTable/PagedItemsFilters'
import { FILTER_TYPE, SEX } from '../../constants'
import { selectTaxonsByID } from '../../selectors'
import store from '../../store'

enum IndividualColumnID {
	ID = 'ID',
	NAME = 'NAME',
	TAXON = 'TAXON',
	SEX = 'SEX',
	PEDIGREE = 'PEDIGREE',
	COHORT = 'COHORT',
}

export interface ObjectWithIndividual {
	individual: Individual
}
export type IndividualColumn = IdentifiedTableColumnType<ObjectWithIndividual>

export const INDIVIDUAL_COLUMN_DEFINITIONS: { [key in IndividualColumnID]: IndividualColumn } = {
	[IndividualColumnID.ID]: {
		columnID: IndividualColumnID.ID,
		title: 'ID',
		dataIndex: ['individual', 'id'],
		sorter: { multiple: 1 },
    width: 115,
		render: (id, { individual }) => <Link to={`/individuals/${individual.id}`}>{id}</Link>,
	},
	[IndividualColumnID.NAME]: {
		columnID: IndividualColumnID.NAME,
		title: 'Name',
		dataIndex: ['individual', 'name'],
		sorter: { multiple: 1 },
		render: (name, { individual }) => (
			<Link to={`/individuals/${individual.id}`}>
				<div>{name}</div>
				{individual.alias && (
					<div>
						<small>alias: {individual.alias}</small>
					</div>
				)}
			</Link>
		),
	},
	[IndividualColumnID.TAXON]: {
		columnID: IndividualColumnID.TAXON,
		title: 'Taxon',
		dataIndex: ['individual', 'taxon'],
		sorter: { multiple: 1 },
		// TODO: init options with dynamic filters
		// options: Object.values(taxons.itemsByID).map(x => ({ label: x.name, value: x.name })), // for getFilterProps
		// render: (_, {individual}) => <em>{(individual.taxon && withTaxon(taxons.itemsByID, individual.taxon, taxon => taxon.name, "Loading..."))}</em>,
		render: (_, { individual }) => (
			<WithTaxonRenderComponent objectID={individual.taxon} placeholder={'Loading...'} render={(taxon) => <em>{taxon.name}</em>} />
		),
	},
	[IndividualColumnID.SEX]: {
		columnID: IndividualColumnID.SEX,
		title: 'Sex',
		dataIndex: ['individual', 'sex'],
		sorter: { multiple: 1 },
	},
	[IndividualColumnID.PEDIGREE]: {
		columnID: IndividualColumnID.PEDIGREE,
		title: 'Pedigree',
		dataIndex: ['individual', 'pedigree'],
		sorter: { multiple: 1 },
	},
	[IndividualColumnID.COHORT]: {
		columnID: IndividualColumnID.COHORT,
		title: 'Cohort',
		dataIndex: ['individual','cohort'],
		sorter: { multiple: 1 },
	},
}

function getTaxonFilterOptions() {
	const taxons = selectTaxonsByID(store.getState())
	if (taxons) {
		return getAllItems(taxons).map((taxon) => {
			return {
				label: taxon.name,
				value: taxon.name,
			}
		})
	}
	return []
}

export const INDIVIDUAL_FILTER_DEFINITIONS: { [key in IndividualColumnID]: FilterDescription } = {
	[IndividualColumnID.ID]: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key: UNDEFINED_FILTER_KEY,
		label: 'ID',
	},
	[IndividualColumnID.NAME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Name',
		batch: true,
	},
	[IndividualColumnID.TAXON]: {
		type: FILTER_TYPE.SELECT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Taxon',
		mode: 'multiple',
		dynamicOptions: getTaxonFilterOptions,
	},
	[IndividualColumnID.SEX]: {
		type: FILTER_TYPE.SELECT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Sex',
		mode: 'multiple',
		placeholder: 'All',
		options: SEX.map((x) => ({ label: x, value: x })),
	},
	[IndividualColumnID.PEDIGREE]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Pedigree',
	},
	[IndividualColumnID.COHORT]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Cohort',
	},
}

export const INDIVIDUAL_FILTER_KEYS: {[key in IndividualColumnID]: string} = {
	[IndividualColumnID.ID]: 'id',
	[IndividualColumnID.NAME]: 'name',
	[IndividualColumnID.TAXON]: 'taxon__name',
	[IndividualColumnID.SEX]: 'sex',
	[IndividualColumnID.PEDIGREE]: 'pedigree',
	[IndividualColumnID.COHORT]: 'cohort',
}