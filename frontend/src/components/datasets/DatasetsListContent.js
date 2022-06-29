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

    const checked = new Set(data?.results?.filter((dataset) => {
        return dataset.files[0].validation_date
    }).map((dataset) => dataset.id))

    const dataSource = data?.results?.map((dataset, key) => {
        const id = dataset.id;
        const project_name = dataset.project_name;
        const run_name = dataset.run_name;
        const lane = dataset.lane;

        const fileObjects = Object.values(dataset.files);
        
        const file_paths = fileObjects.map((file) => {
            return <div>{file.file_path}</div>
        })
        const completion_date = fileObjects.find((file) => file.completion_date)?.completion_date ?? "";
        const validation_date = fileObjects.find((file) => file.validation_date)?.validation_date ?? "";

        const checkbox = <Checkbox
            onChange={(e) => {
                console.log(id)
            }}
            checked={checked.has(id)} />;

        return {
            key,
            id,
            project_name,
            run_name,
            lane,
            files: file_paths,
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
            const { results } = res.data;
            setData(
                results.reduce((prev, dataset) => {
                    return {
                        ...prev,
                        [dataset.id]: dataset,
                    }
                })
            )
        })
    })

    // temporary
    return <Table columns={columns} dataSource={dataSource} scroll={{y: 500}} />;
}

export default connect(mapStateToProps, actionCreators)(DatasetsListContent);