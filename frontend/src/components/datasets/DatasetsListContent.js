import { Checkbox, Table } from "antd";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import api, { withToken } from "../../utils/api";

const mapStateToProps = state => ({
    token: state.auth.tokens.access,
});
const actionCreators = {};

const DatasetsListContent = ({
    token,
}) => {
    const [data, setData] = useState(null);

    const dataSource = data?.results?.map((dataset) => {
        const id = dataset.id;
        const project_name = dataset.project_name;
        const run_name = dataset.run_name;
        const lane = dataset.lane;
        const files = dataset.files.map((file) => {
            return <div>{file.file_path}</div>
        })
        const completion_date = dataset.files[0]?.completion_date ?? "";
        const validation_date = dataset.files[0]?.validation_date ?? "";

        const checkbox = <Checkbox onChange={(e) => {
            console.log(run_name)
        }} />;

        return {
            key: id,
            id,
            project_name,
            run_name,
            lane,
            files,
            completion_date,
            validation_date,
            checkbox,
        }
    }) ?? []

    const columns = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
            width: `${Math.max(...dataSource.map((dataset) => dataset.id.toString().length), "ID".length*2)}em`,
        },
        {
            title: "Project Name",
            dataIndex: "project_name",
            key: "project_name",
            width: `${Math.max(...dataSource.map((dataset) => dataset.project_name.length), "Project Name".length)}em`,
        },
        {
            title: "Run Name",
            dataIndex: "run_name",
            key: "run_name",
            width: `${Math.max(...dataSource.map((dataset) => dataset.run_name.length), "Run Name".length)}em`,
        },
        {
            title: "Lane",
            dataIndex: "lane",
            key: "lane",
            width: `${Math.max(...dataSource.map((dataset) => dataset.lane.length), "Lane".length*2)}em`,
        },
        {
            title: "Files",
            dataIndex: "files",
            key: "files",
        },
        {
            title: "Completion Date",
            dataIndex: "completion_date",
            key: "completion_date",
            width: `${Math.max(...dataSource.map((dataset) => dataset.completion_date.length), "Completion Date".length)}em`,
        },
        {
            title: "Validation Date",
            dataIndex: "validation_date",
            key: "validation_date",
            width: `${Math.max(...dataSource.map((dataset) => dataset.validation_date.length), "Validation Date".length)}em`,
        },
        {
            title: "Release Data",
            dataIndex: "checkbox",
            key: "checkbox",
            width: `${"Release Data".length}em`,
        },
    ]

    useEffect(() => {
        withToken(token, api.datasets.list)().then(res => {
            setData(res.data);
        })
    })

    // temporary
    return <Table columns={columns} dataSource={dataSource} scroll={{y: 500}} />;
}

export default connect(mapStateToProps, actionCreators)(DatasetsListContent);