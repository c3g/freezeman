import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Table} from "antd";
import "antd/es/table/style/css";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import { list } from "../../modules/individuals/actions";

const TABLE_COLUMNS = [
    {
        title: "Name",
        dataIndex: "id",
        render: id => <Link to={`/individuals/${id}`}>{id}</Link>,
    },
    {
        title: "Taxon",
        dataIndex: "taxon",
        filters: [
            {
                text: "Homo sapiens",
                value: "Homo sapiens",
            },
            {
                text: "Mus musculus",
                value: "Mus musculus",
            },
        ],
        onFilter: (value, record) => record.taxon === value,
        render: taxon => <em>{taxon}</em>,
    },
    {
        title: "Sex",
        dataIndex: "sex",
        filters: [
            {
                text: "Male",
                value: "M",
            },
            {
                text: "Female",
                value: "F",
            },
            {
                text: "Unknown",
                value: "Unknown",
            },
        ],
        onFilter: (value, record) => record.sex === value,
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

const mapStateToProps = state => ({
    individualsByID: state.individuals.itemsByID,
    individuals: state.individuals.items,
    page: state.individuals.page,
    totalCount: state.individuals.totalCount,
    isFetching: state.individuals.isFetching,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ list }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(IndividualsListContent);
