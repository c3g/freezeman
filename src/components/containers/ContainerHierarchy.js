import React from "react";
import {connect} from "react-redux";

import {Tree} from "antd";
import "antd/es/tree/style/css";

import {LoadingOutlined} from "@ant-design/icons";
import {fetchContainer} from "../../modules/containers/actions";

const buildContainerTreeFromPath = (containersByBarcode, path) => {
    if (path.length === 0) return [];
    const container = containersByBarcode[path[0]];
    // TODO: Click behaviour?
    return [{
        title: `${container.name} (Kind: ${container.kind}, Barcode: ${container.barcode})`,
        key: container.barcode,
        children: buildContainerTreeFromPath(containersByBarcode, path.slice(1)),
    }];
};

const ContainerHierarchy = ({container, containersByBarcode, isFetching, isFetchingBarcodes, fetchContainer}) => {
    const barcodePath = [container.barcode];
    let loading = isFetching;
    let parent = container.location;
    while (!loading && parent !== null && parent !== undefined) {
        const isFetchingCurrent = isFetchingBarcodes.includes(parent);
        if (isFetchingCurrent || !(parent in containersByBarcode)) {
            if (!isFetchingCurrent) fetchContainer(parent);
            loading = true;
            break;
        }

        barcodePath.push(parent);
        parent = parent.location;
    }

    barcodePath.reverse();

    // TODO: Render siblings? or something like "And 432 others..."

    const tree = loading ? [{
        title: "Loading...",
        key: "loading",
        icon: <LoadingOutlined />,
    }] : buildContainerTreeFromPath(containersByBarcode, barcodePath);

    return <Tree defaultExpandAll defaultSelectedKeys={[barcodePath[0]]} expandedKeys={barcodePath} treeData={tree} />;
};

const mapStateToProps = state => ({
    containersByBarcode: state.containers.itemsByBarcode,
    isFetching: state.containers.isFetching,
    isFetchingBarcodes: state.containers.isFetchingBarcodes,
});

// noinspection JSUnusedGlobalSymbols
const mapDispatchToProps = dispatch => ({
    fetchContainer: barcode => dispatch(fetchContainer(barcode)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ContainerHierarchy);
