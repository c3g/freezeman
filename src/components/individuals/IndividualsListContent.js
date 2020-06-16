import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import {list} from "../../modules/individuals/actions";

const TABLE_COLUMNS = [
    {
        title: "Name",
        dataIndex: "id",
        render: id => <Link to={`/individuals/${id}`}>{id}</Link>,
    },
    {
        title: "Taxon",
        dataIndex: "taxon",
        render: taxon => <em>{taxon}</em>,
    },
    {
        title: "Sex",
        dataIndex: "sex",
    },
    {
        title: "Pedigree",
        dataIndex: "pedigree"  // TODO: Link to modal with optional pedigree ID, mother, father
    },
    {
        title: "Cohort",
        dataIndex: "cohort"
    }

    // TODO: Detail action with optional pedigree ID, mother, father, all available samples, cohort size, etc.
];

const mapStateToProps = state => ({
    individualsByID: state.individuals.itemsByID,
    individuals: state.individuals.items,
    page: state.individuals.page,
    totalCount: state.individuals.totalCount,
    isFetching: state.individuals.isFetching,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ list }, dispatch);

const IndividualsListContent = ({
    individuals,
    individualsByID,
    isFetching,
    page,
    totalCount,
    list,
}) => {
    return <>
        <AppPageHeader title="Individuals" />
        <PageContent>
            <PaginatedTable
                columns={TABLE_COLUMNS}
                items={individuals}
                itemsByID={individualsByID}
                rowKey="id"
                loading={isFetching}
                totalCount={totalCount}
                page={page}
                onLoad={list}
            />
        </PageContent>
    </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(IndividualsListContent);
