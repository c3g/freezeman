import React from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Table} from "antd";
import "antd/es/table/style/css";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";

const TABLE_COLUMNS = [
    {
        title: "Name",
        dataIndex: "name",
        render: name => <Link to={`/individuals/${name}`}>{name}</Link>,
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

const IndividualsListContent = ({individuals, isFetching}) => {
    return <>
        <AppPageHeader title="Individuals" />
        <PageContent>
            <Table size="small"
                   bordered={true}
                   columns={TABLE_COLUMNS}
                   dataSource={individuals}
                   rowKey="id"
                   loading={isFetching} />
        </PageContent>
    </>;
};

const mapStateToProps = state => ({
    individuals: state.individuals.items,
    isFetching: state.individuals.isFetching,
});

export default connect(mapStateToProps)(IndividualsListContent);
