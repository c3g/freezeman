import React, { useState, useEffect } from "react";
import {Link} from "react-router-dom";
import {connect} from "react-redux";
import {set} from "object-path-immutable";
import {Tree, Typography} from "antd";

import {
  LoadingOutlined,
  DownOutlined,
  EllipsisOutlined,
  HomeOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
  TableOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
} from "@ant-design/icons";
import {get, listChildrenRecursively, listSamplesRecursively} from "../../modules/containers/actions";
import platform, * as PLATFORM from "../../utils/platform";

const {Text} = Typography;

/* interface DataNode {
 *   key: string;
 *   title: node;
 *   icon: node;
 *   isLeaf?: boolean;
 *   children?: DataNode[];
 * } */

const iconRules = [
  { match: /room/i,    icon: () => <HomeOutlined /> },
  { match: /freezer/i, icon: () => <DatabaseOutlined /> },
  { match: /rack/i,    icon: () => <TableOutlined /> },
  { match: /plate/i,   icon: () => <TableOutlined /> },
  { match: /tube/i,    icon: () => <ExperimentOutlined /> },
];

const defaultIcon = <TableOutlined />;

const getIcon = container => {
  const rule = iconRules.find(r => r.match.test(container.kind))
  return rule ? rule.icon : defaultIcon
}

const entryStyle = { marginLeft: '0.5em' };

const renderEntry = content =>
  <span style={entryStyle}>
    {content}
  </span>;

const renderContainer = container =>
  <span style={entryStyle}>
    <Link to={`/containers/${container.id}`}>
      <b>{container.name}</b>{' '}
      <Text type="secondary">
        {container.kind}{' '}
        {container.children?.length > 0 &&
          `(${container.children.length} children)`
        }
      </Text>{' '}
      {container.coordinates &&
        <Text type="secondary">
          @ {container.coordinates}
        </Text>
      }
    </Link>
  </span>;

const renderSample = (sample, sampleKind) =>
  renderEntry(
    <Link to={`/samples/${sample.id}`}>
      <b>{sample.name}</b> sample ({sampleKind}){' '}
      {sample.coordinates &&
        `@ ${sample.coordinates}`
      }
    </Link>
  )

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
  samplesByID: state.samples.itemsByID,
  sampleKinds: state.sampleKinds,
});

const actionCreators = {get, listChildrenRecursively, listSamplesRecursively};

const ContainerTree = ({container, containersByID, samplesByID, sampleKinds, listChildrenRecursively, listSamplesRecursively}) => {
  if (!container || !container.parents)
    return <LoadingOutlined />;

  const initTreeData = [
  {
    title: 'Expand to load',
    key: '0',
  },
  {
    title: 'Expand to load',
    key: '1',
  },
  {
    title: 'Tree Node',
    key: '2',
    isLeaf: true,
  },
];
  const [explodedKeys, setExplodedKeys] = useState({});
  const [treeData, setTreeData] = useState(initTreeData);
  useEffect(() => { setExplodedKeys({}) }, [container.id]);

  const context = {
    containersByID,
    samplesByID,
    sampleKinds,
    explodedKeys,
  }

  const onLoadData = async (key, children) => {
    // await listChildrenRecursively(container.id)
    // await listSamplesRecursively(container.id)

    return new Promise((resolve) => {
      if (children) {
        resolve();
        return;
      }

      setTimeout(() => {
        setTreeData((origin) =>
          updateTreeData(origin, key, [
            {
              title: 'Child Node',
              key: `${key}-0`,
            },
            {
              title: 'Child Node',
              key: `${key}-1`,
            },
          ]),
        );
        resolve();
      }, 1000);
    });
  }

  const onSelect = (selectedKeys, { selected, node, event, nativeEvent }) => {
    /* Only ctrl+click event seems to be disabled by ant,
     * therefore we implement the behavior ourselves. */
    if (event === 'select') {
      const isMacOS = platform().os === PLATFORM.OS.MACOS
      const isOpenInNewTab =
        isMacOS ? nativeEvent.metaKey : nativeEvent.ctrlKey
      if (isOpenInNewTab) {
        window.open(node.url)
      }
    }
  }

  const tree = [{
    key: `test`,
    isLeaf: false,
    icon:  <EllipsisOutlined />,
    title: 'test'
  }]

  const updateTreeData = (list, key, children) => {
    return list.map((node) => {
      if (node.key === key) {
        return { ...node, children };
      }

      if (node.children) {
        return { ...node, children: updateTreeData(node.children, key, children) };
      }

      return node;
    });
  }

  const buildTree = (container) => {
    if (container) {
      const url = `/containers/${container.id}`
      const title = renderContainer(container);
      const icon = getIcon(container);
      const isFetching = container && container.isFetching;

      let children = []
      container.children?.map(cid => children.push(buildTree(containersByID[cid])))

      return [{
        key: container.id,
        url,
        icon: isFetching ? <LoadingOutlined /> : <EllipsisOutlined />,
        title,
        isLeaf: (children === 0),
        children,
      }];

    } else {
      return []
    }

  }

  return (
    <Tree
      showIcon
      showLine
      className="ant-tree-show-line-no-icon"
      switcherIcon={<DownOutlined />}
      selectedKeys={[]}
      treeData={treeData}
      defaultExpandedKeys={container.parents}
      loadData={onLoadData}
      onSelect={onSelect}
    />
  );
};

export default connect(mapStateToProps, actionCreators)(ContainerTree);