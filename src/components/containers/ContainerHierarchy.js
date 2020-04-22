import React from "react";
import {connect} from "react-redux";

import {Tree} from "antd";
import "antd/es/tree/style/css";

import {LoadingOutlined} from "@ant-design/icons";
import {fetchContainer} from "../../modules/containers/actions";

const buildContainerTreeFromPath = (containersByBarcode, path) => {
    if (path.length === 0) return [];
    const container = containersByBarcode[path[0]];
    const otherChildren = container.children.length - (path.length === 1 ? 0 : 1);
    const samples = container.samples.length;
    // TODO: Click behaviour?
    return [{
        title: `${container.name} (Kind: ${container.kind}, Barcode: ${container.barcode}${
            container.coordinates ? `, Coordinates: ${container.coordinates}` : ""})`,
        key: container.barcode,
        children: [
            ...buildContainerTreeFromPath(containersByBarcode, path.slice(1)),
            ...(otherChildren ? [{
                // TODO: Expandable / replaceable
                title: `${otherChildren}${path.length === 1 ? '' : ' other'} container${
                    otherChildren === 1 ? '' : 's'}`,
                key: `${container.barcode}$children`,
            }] : []),
            ...(samples ? [{
                // TODO: Expandable / replaceable
                title: `${samples} sample${samples === 1 ? '' : 's'}`,
                key: `${container.barcode}$samples`,
            }] : []),
        ],
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

    // TODO: Render siblings? or something like "And 432 others..." which expands on click

    const tree = loading ? [{
        title: "Loading...",
        key: "loading",
        icon: <LoadingOutlined />,
    }] : buildContainerTreeFromPath(containersByBarcode, barcodePath);

    return <Tree defaultExpandAll
                 selectedKeys={[barcodePath[barcodePath.length - 1]]}
                 expandedKeys={barcodePath}
                 treeData={tree} />;
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
