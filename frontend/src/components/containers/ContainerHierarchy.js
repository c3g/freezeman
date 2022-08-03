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
import {get, listChildren} from "../../modules/containers/actions";
import platform, * as PLATFORM from "../../utils/platform";
import {withSample} from "../../utils/withItem";

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

const onClick = (e) => {
  if (e) {
    const nativeEvent = e.nativeEvent
    const isMacOS = platform().os === PLATFORM.OS.MACOS
    const isOpenInNewTab =
      isMacOS ? nativeEvent.metaKey : nativeEvent.ctrlKey
    if (isOpenInNewTab) {
      const url = e.currentTarget.href
      window.open(url)
    }
  }
}

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

const renderSample = (sample, sampleKind) => {
  return (
    <span style={entryStyle}>
       <Link to={`/samples/${sample.id}`} onClick={onClick}>
         {sample.depleted ?
            <CloseCircleTwoTone twoToneColor="#eb2f96" /> :
            <CheckCircleTwoTone twoToneColor="#52c41a" />
         }
         {' '}
        <b>{sample.name}</b> sample ({sampleKind}){' '}
        {sample.coordinates &&
          `@ ${sample.coordinates}`
        }
      </Link>
    </span>
  )
}

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
  samplesByID: state.samples.itemsByID,
  sampleKinds: state.sampleKinds,
});

const actionCreators = {get, listChildren};

const ContainerHierarchy = ({container, containersByID, samplesByID, sampleKinds, listChildren}) => {
  
  const [explodedKeys, setExplodedKeys] = useState({});
  useEffect(() => { setExplodedKeys({}) }, [container?.id]);

  if (!container || !container.parents)
    return <LoadingOutlined />;

  const context = {
    containersByID,
    samplesByID,
    sampleKinds,
    explodedKeys,
  }

  const renderContainer = container => {
    return (
        <span style={entryStyle}>
          <Link to={`/containers/${container.id}`} onClick={onClick}>
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
            <Text type="secondary">
              {container.samples?.length > 0 &&
              ` [${container.samples.length} sample${container.samples.length === 1 ? '' : 's'}]`
              }
            </Text>
          </Link>

          <ul>
            { container.samples?.map(sampleId => {
              const id = withSample(context.samplesByID, sampleId, sample => sample.id, 'Loading...')
              const sample = context.samplesByID[id]
              const sampleKind = context.sampleKinds.itemsByID[sample?.sample_kind]?.name
              return <li>
                {sample ?
                    renderSample(sample, sampleKind) :
                    <span style={entryStyle}>
                      <Link to={`/samples/${sampleId}`} onClick={onClick}> Sample </Link> {' '}
                      <Text type="secondary">
                        loading...
                      </Text>
                    </span>
                }
              </li>
            })}
          </ul>
      </span>
    )
  }

  const buildContainerTreeFromPath = (context, path) => {
    if (path.length === 0)
      return [];

    const id = path[0];
    const container = context.containersByID[id];
    const isExploded = context.explodedKeys[id] === true;
    const isLoaded = container && container.isLoaded;
    const isFetching = container && container.isFetching;

    if (!isLoaded)
      return loadingEntry(id);

    const url = `/containers/${container.id}`
    const title = renderContainer(container);
    const icon = getIcon(container);
    const children = buildContainerTreeFromPath(context, path.slice(1));

    const otherChildren = container.children.filter(id => id !== parseInt(path[1], 10));
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
        otherChildren.sort((a, b) => compareCoordinates(context.containersByID[a], context.containersByID[b]))
        children.push(...otherChildren.map(containerId =>
          buildContainerTreeFromPath(context, [containerId])
        ).flat());
      }
    }

    return [{
      key: container.id,
      url,
      icon,
      title,
      isLeaf: children.length === 0,
      children,
    }]
  };

  const path = container.parents.concat([container.id]);
  const tree = buildContainerTreeFromPath(context, path);

  const expandCollapsedNode = async node => {
    const id = node.key.replace(/\$(children|samples)/, '');
    const hasChildren = node.key.endsWith('$children');
    if (hasChildren)
      await listChildren(id, path);

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
    const id = node.key
    if (isCollapsed(id))
      await expandCollapsedNode(node)
    else
      await expandCollapsedChildren(node)
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
      height={400}
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
