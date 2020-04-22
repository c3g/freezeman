import React from "react";
import {connect} from "react-redux";

import {Table} from "antd";
import "antd/es/table/style/css";

import AppPageHeader from "../AppPageHeader";
import PageContainer from "../PageContainer";

const TABLE_COLUMNS = [
    {
        title: "Name",
        dataIndex: "name"
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

const IndividualsPage = ({individuals, isFetching}) => <PageContainer>
    <AppPageHeader title="Individuals" />
    <div style={{padding: "16px 24px 8px 24px", overflowX: "auto"}}>
        <Table size="small"
               bordered={true}
               columns={TABLE_COLUMNS}
               dataSource={individuals}
               rowKey="name"
               loading={isFetching} />
    </div>
</PageContainer>;

const mapStateToProps = state => ({
    individuals: state.individuals.items,
    isFetching: state.individuals.isFetching,
});

export default connect(mapStateToProps)(IndividualsPage);
