import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";

import {Tree, Typography} from "antd";
import "antd/es/tree/style/css";
import "antd/es/typography/style/css";

import {
    LoadingOutlined,
    DownOutlined,
    EllipsisOutlined,
    HomeOutlined,
    ExperimentOutlined,
    DatabaseOutlined,
    TableOutlined,
} from "@ant-design/icons";
import {get} from "../../modules/containers/actions";

const {Text} = Typography;

const iconRules = [
    { match: /room/,    icon: () => <HomeOutlined /> },
    { match: /freezer/, icon: () => <DatabaseOutlined /> },
    { match: /rack/,    icon: () => <TableOutlined /> },
    { match: /plate/,   icon: () => <TableOutlined /> },
    { match: /tube/,    icon: () => <ExperimentOutlined /> },
];

const defaultIcon = <TableOutlined />;

const getIcon = container => {
    const rule = iconRules.find(r => r.match.test(container.kind))
    return rule ? rule.icon : defaultIcon
}

const entryStyle = { marginLeft: '0.5em' };

const buildContainerTreeFromPath = (containersByID, path) => {
    if (path.length === 0)
        return [];

    const container = containersByID[path[0]];
    const otherChildren = container.children.length - (path.length === 1 ? 0 : 1);
    const samples = container.samples.length;

    const title = <span style={entryStyle}>
        <strong>{container.name}</strong>{' '}
        <Text type="secondary">
            {container.kind}
        </Text>{' '}
        {container.coordinates &&
            <Text type="secondary">
                @ {container.coordinates}
            </Text>
        }
    </span>;

    const icon = getIcon(container);

    const children = buildContainerTreeFromPath(containersByID, path.slice(1));

    // TODO: Expandable / replaceable
    if (otherChildren)
        children.push({
            title: <span style={entryStyle}>{otherChildren}{path.length === 1 ? '' : ' other'} container{otherChildren === 1 ? '' : 's'}</span>,
            icon: <EllipsisOutlined />,
            key: `${container.id}$children`,
        })

    // TODO: Expandable / replaceable
    if (samples)
        children.push({
            title: <span style={entryStyle}>{samples} sample{samples === 1 ? '' : 's'}</span>,
            icon: <EllipsisOutlined />,
            key: `${container.id}$samples`,
        })

    // TODO: Click behaviour?
    return [{
        title,
        icon,
        key: container.id,
        children,
    }];
};

const mapStateToProps = state => ({
    containersByID: state.containers.itemsByID,
    isFetching: state.containers.isFetching,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({get}, dispatch)

const ContainerHierarchy = ({container, containersByID, isFetching, get}) => {
    if (!container || container.isFetching || !container.parents)
        return <LoadingOutlined />;

    const barcodePath = container.parents.concat([container.id]);
    console.log(barcodePath.map(id => containersByID[id]))

    const tree = buildContainerTreeFromPath(containersByID, barcodePath);

    // expandedKeys={barcodePath}
    return (
        <Tree
            showIcon
            showLine
            className="ant-tree-show-line-no-icon"
            switcherIcon={<DownOutlined />}
            defaultExpandAll
            selectedKeys={[barcodePath[barcodePath.length - 1]]}
            treeData={tree}
        />
    );
};

export default connect(mapStateToProps, mapDispatchToProps)(ContainerHierarchy);
