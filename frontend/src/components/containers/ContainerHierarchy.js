import React, { useState, useEffect } from "react";
import {Link, useHistory} from "react-router-dom";
import {connect} from "react-redux";
import {set} from "object-path-immutable";
import {Tree, Typography} from "antd";

import {
  LoadingOutlined,
  CheckOutlined,
  DownOutlined,
  EllipsisOutlined,
  HomeOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {get, listChildren, listSamples} from "../../modules/containers/actions";

const {Text} = Typography;

const iconRules = [
  { match: /room/i,    icon: () => <HomeOutlined /> },
  { match: /freezer/i, icon: () => <DatabaseOutlined /> },
  { match: /rack/i,    icon: () => <TableOutlined /> },
  { match: /plate/i,   icon: () => <TableOutlined /> },
  { match: /tube/i,    icon: () => <ExperimentOutlined /> },
];

const isCollapsed = key => /\$(children|samples)/.test(key);

const defaultIcon = <TableOutlined />;

const getIcon = container => {
  const rule = iconRules.find(r => r.match.test(container.kind))
  return rule ? rule.icon : defaultIcon
}

const entryStyle = { marginLeft: '0.5em' };

const loadingEntry = id => {
  return ({
    title: <span style={entryStyle}>
      <strong>{id}</strong>{' '}
      <Text type="secondary">loading...</Text>
    </span>,
    icon: <LoadingOutlined />,
    key: id,
  })
};

const renderEntry = content =>
  <span style={entryStyle}>
    {content}
  </span>;

const renderContainer = container =>
  <span style={entryStyle}>
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

  const title = renderContainer(container);

  const icon = getIcon(container);

  const children = buildContainerTreeFromPath(context, path.slice(1));

  if (otherChildren.length) {
    if (!isExploded) {
      children.push({
        title: renderEntry(
          <Text type="secondary">
            {otherChildren.length}{path.length === 1 ? '' : ' other'} container{otherChildren.length === 1 ? '' : 's'}{' '}
            (click to expand)
          </Text>
        ),
        icon: isFetching ? <LoadingOutlined /> : <EllipsisOutlined />,
        key: `${container.id}$children`,
      });
    }
    else if (isFetching) {
      children.push({
        title: renderEntry(
          <Text type="secondary">
            {otherChildren.length}{path.length === 1 ? '' : ' other'} container{otherChildren.length === 1 ? '' : 's'}{' '}
            (loading)
          </Text>
        ),
        icon: <LoadingOutlined />,
        key: `${container.id}$children`,
      })
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
        title: renderEntry(
          <Text type="secondary">
            {samples.length} sample{samples.length === 1 ? '' : 's'}{' '}
            (click to expand)
          </Text>
        ),
        icon: <EllipsisOutlined />,
        key: `${container.id}$samples`,
      })
    }
    else if (isFetching) {
      children.push({
        title: renderEntry(
          <Text type="secondary">
            {samples.length} sample{samples.length === 1 ? '' : 's'}{' '}
            (loading)
          </Text>
        ),
        icon: <LoadingOutlined />,
        key: `${container.id}$samples`,
      })
    }
    else {
      children.push(...samples.map(sampleId => {
        const sample = context.samplesByID[sampleId];
        if (!sample || sample.isFetching)
          return loadingEntry(sampleId);
        const sampleKind = context.sampleKinds.itemsByID[sample.sample_kind]?.name
        return {
          title: renderEntry(
            <Link to={`/samples/${sample.id}`}>
              <strong>{sample.name}</strong>{' '}
              sample ({sampleKind})
            </Link>
          ),
          icon: <CheckOutlined />,
          key: `sample-${sampleId}`,
          type: 'sample',
        };
      }));
    }
  }

  return [{
    title,
    icon,
    key: container.id,
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

  const history = useHistory();

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

  const onSelect = (selectedKeys, { node }) => {
    const [selectedKey] = selectedKeys;
    if (selectedKey === undefined) {
      // De-selection event; ignore it
      return;
    }

    if (/\$(children|samples)/.test(selectedKey)) {
      // Explode collapsed nodes

      const id = selectedKey.replace(/\$(children|samples)/, '');
      const hasChildren = selectedKey.endsWith('$children');
      if (hasChildren)
        listChildren(id, path);
      else
        listSamples(id);
      setExplodedKeys(set(explodedKeys, [id], true));
    } else {
      // Navigate to container
      if (node.type === 'sample')
        history.push(`/samples/${selectedKey}`);
      else
        history.push(`/containers/${selectedKey}`);
    }
  }

  const onExpand = (_, { expanded, node }) => {
    if (!expanded) {
      return;
    }

    const childrenNodes = node.children.filter(n => isCollapsed(n.key));

    if (childrenNodes.length > 0) {
      // Explode collapsed nodes

      childrenNodes.forEach(n => {
        const id = n.key.replace(/\$(children|samples)/, '');
        const hasChildren = n.key.endsWith('$children');
        if (hasChildren)
          listChildren(id, path);
        else
          listSamples(id);
        setExplodedKeys(set(explodedKeys, [id], true));
      })
    }
  }

  console.log({ explodedKeys })
  return (
    <Tree
      showIcon
      showLine
      className="ant-tree-show-line-no-icon"
      switcherIcon={<DownOutlined />}
      selectedKeys={[path[path.length - 1]]}
      treeData={tree}
      defaultExpandedKeys={container.parents}
      onSelect={onSelect}
      onExpand={onExpand}
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
