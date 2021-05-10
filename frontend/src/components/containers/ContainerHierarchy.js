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
import {get, listChildren, listSamples} from "../../modules/containers/actions";
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

const isCollapsed = key => /\$(children|samples)/.test(key);

const entryStyle = { marginLeft: '0.5em' };

const loadingEntry = id => {
  return {
    key: id,
    title: <span style={entryStyle}>
      <b>{id}</b>{' '}<Text type="secondary">loading...</Text>
    </span>,
    icon: <LoadingOutlined />,
  }
};

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

const buildContainerTreeFromPath = (context, path) => {
  if (path.length === 0)
    return [];

  const id = path[0];

  const container = context.containersByID[id];
  const isExploded = context.explodedKeys[id] === true;
  const isLoaded = container && container.isLoaded;
  const isFetching = container && container.isFetching;

  if (!isLoaded) {
    return loadingEntry(id);
  }

  const otherChildren = container.children.filter(id => id !== parseInt(path[1], 10));
  otherChildren.sort((a, b) => compareCoordinates(context.containersByID[a], context.containersByID[b]))
  // length - (path.length === 1 ? 0 : 1);
  const samples = container.samples;

  const url = `/containers/${container.id}`
  const title = renderContainer(container);
  const icon = getIcon(container);
  const children = buildContainerTreeFromPath(context, path.slice(1));

  if (otherChildren.length) {
    if (!isExploded) {
      children.push({
        key: `${container.id}$children`,
        isLeaf: false,
        icon: isFetching ? <LoadingOutlined /> : <EllipsisOutlined />,
        title: renderEntry(
          <Text type="secondary">
            {otherChildren.length}{path.length === 1 ? '' : ' other'} container{otherChildren.length === 1 ? '' : 's'}{' '}
          </Text>
        ),
      });
    }
    else {
      children.push(...otherChildren.map(containerId =>
        buildContainerTreeFromPath(context, [containerId])
      ).flat());
    }
  }

  if (samples.length) {
    if (!isExploded) {
      children.push({
        key: `${container.id}$samples`,
        title: renderEntry(
          <Text type="secondary">
            {samples.length} sample{samples.length === 1 ? '' : 's'}{' '}
          </Text>
        ),
        icon: <EllipsisOutlined />,
      })
    }
    else {
      const childrenSamples = samples.map(sampleId => {
        const sample = context.samplesByID[sampleId];
        if (!sample || sample.isFetching)
          return loadingEntry(sampleId);
        const sampleKind = context.sampleKinds.itemsByID[sample.sample_kind]?.name
        return {
          key: sampleId,
          type: 'sample',
          url: `/samples/${sampleId}`,
          isLeaf: true,
          icon: sample.depleted ?
            <CloseCircleTwoTone twoToneColor="#eb2f96" /> :
            <CheckCircleTwoTone twoToneColor="#52c41a" />,
          title: renderSample(sample, sampleKind),
        };
      });
      childrenSamples.sort((a, b) =>
        compareCoordinates(
          context.samplesByID[a.key],
          context.samplesByID[b.key]
        ));
      children.push(...childrenSamples);
    }
  }

  return [{
    key: container.id,
    url,
    icon,
    title,
    isLeaf: children.length === 0,
    children,
  }];
};

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
  samplesByID: state.samples.itemsByID,
  sampleKinds: state.sampleKinds,
});

const actionCreators = {get, listChildren, listSamples};

const ContainerHierarchy = ({container, containersByID, samplesByID, sampleKinds, listChildren, listSamples}) => {
  if (!container || !container.parents)
    return <LoadingOutlined />;

  const [explodedKeys, setExplodedKeys] = useState({});
  useEffect(() => { setExplodedKeys({}) }, [container.id]);

  const context = {
    containersByID,
    samplesByID,
    sampleKinds,
    explodedKeys,
  }
  const path = container.parents.concat([container.id]);
  const tree = buildContainerTreeFromPath(context, path);

  const expandCollapsedNode = async node => {
    const id = node.key.replace(/\$(children|samples)/, '');
    const hasChildren = node.key.endsWith('$children');
    if (hasChildren)
      await listChildren(id, path);
    else
      await listSamples(id);
    setExplodedKeys(set(explodedKeys, [id], true));
  }

  const expandCollapsedChildren = async node => {
    const childrenNodes = node.children.filter(n => isCollapsed(n.key));

    if (childrenNodes.length > 0) {
      await Promise.all(childrenNodes.map(n =>
        expandCollapsedNode(n)
      ))
    }
  }

  const onLoadData = async (node) => {
    if (isCollapsed(node.key))
      await expandCollapsedNode(node)
    else
      await expandCollapsedChildren(node)
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

  return (
    <Tree
      showIcon
      showLine
      className="ant-tree-show-line-no-icon"
      switcherIcon={<DownOutlined />}
      selectedKeys={[path[path.length - 1]]}
      treeData={tree}
      defaultExpandedKeys={container.parents}
      loadData={onLoadData}
      onSelect={onSelect}
    />
  );
};

export default connect(mapStateToProps, actionCreators)(ContainerHierarchy);

// Helpers

function compareCoordinates(a, b) {
  if (!a || a.isFetching || !b || b.isFetching)
    return +1
  if (a.coordinates && !b.coordinates)
    return -1
  if (b.coordinates && !a.coordinates)
    return +1
  return a.coordinates.localeCompare(b.coordinates)
}
