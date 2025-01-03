import React, {useEffect, useMemo, useState, useRef} from "react";
import {connect} from "react-redux";
import {useNavigate} from "react-router-dom";
import {
  UserOutlined,
  TableOutlined,
  TeamOutlined,
  ProjectOutlined,
  ExperimentOutlined
} from "@ant-design/icons";
import {Select, Tag, Typography} from "antd";

import debounce from "../utils/debounce";
import api, {withToken} from "../utils/api";

const {Text} = Typography;
const {Option} = Select;

const style = {
  alignSelf: "center",
  width: "100%",
}

const tagStyle = {
  margin: "0 2px",
  height: "20px",
}


let lastItems = loadLastItems()


const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  sampleKindsByID: state.sampleKinds.itemsByID
});

const JumpBar = (props) => {
  const {token} = props
  const [value, setValue] = useState(null);
  const [error, setError] = useState(undefined);
  const [isFetching, setIsFetching] = useState(false);
  const [items, setItems] = useState(lastItems);
  const history = useNavigate();
  const selectRef = useRef();

  const search = useMemo(() => debounce(500, async query => {
    try {
      const response = await withToken(token, api.query.search)(query)
      if (response && response.data) {
        setItems(response.data)
      }
    } catch (error) {
      if (error.name == "AbortError") {
        return
      }
      setError(error.message)
    }
    setIsFetching(false)
  }), [token])

  const clear = () => setItems([])

  const onChange = value => {
    if (!value)
      return
    const [type, ...parts] = value.split('_')
    const id = parts.join('_')
    const path = getPath(type, id)
    const item = items.find(i => i.type === type && String(i.item.id) === String(id))
    setValue(null)
    pushItem(item)
    setItems(lastItems)
    history(path)
    selectRef.current?.blur()
  }

  const onSearch = value => {
    setValue(value)
    if (value){
      setIsFetching(true)
      search(value);
    }
    else
      clear();
  }

  useEffect(() => {
    const handler = ev => {
      if (ev.ctrlKey && ev.code === 'KeyK') {
        ev.preventDefault()
        selectRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return <>
    <Select
      showSearch
      filterOption={false}
      popupMatchSelectWidth={false}
      placeholder="Jump to... [Ctrl + K]"
      size="medium"
      style={style}
      loading={isFetching}
      value={value}
      onChange={onChange}
      onSearch={onSearch}
      ref={selectRef}
    >
      {(value === '' ? lastItems : items).map(item => renderItem(item, props))}
    </Select>
    {error &&
      <Text type="danger">
        {error}
      </Text>
    }
  </>;
};

function getPath(type, id) {
  switch (type) {
    case 'container':  return `/containers/${id}`;
    case 'sample':     return `/samples/${id}`;
    case 'individual': return `/individuals/${id}`;
    case 'project':    return `/projects/${id}`;
    case 'user':       return `/users/${id}`;
  }
  throw new Error('unreachable')
}

function renderItem(r, props) {
  switch (r.type) {
    case 'container': return renderContainer(r.item)
    case 'sample': return renderSample(r.item, props.sampleKindsByID)
    case 'individual': return renderIndividual(r.item)
    case 'project': return renderProject(r.item)
    case 'user': return renderUser(r.item)
  }
  throw new Error('unreachable')
}

function renderContainer(container) {
  return (
    <Option key={'container_' + container.id}>
      <TableOutlined />{' '}
      <strong>{container.name}</strong>{' '}
      <Text type="secondary">
        {container.location && container.location.barcode} : {container.coords && ` @ ${container.coords}`}
      </Text>{' '}
      <Text type="secondary">container</Text>{' '}
    </Option>
  );
}

function renderSample(sample, sampleKindsByID) {
  const sampleKind = sampleKindsByID?.[sample.sample_kind]?.name

  return (
    <Option key={'sample_' + sample.id}>
      <ExperimentOutlined />{' '}
      <strong>{sample.name}</strong>{' '}
      {sampleKind &&
        <>
          <Tag style={tagStyle}>{sampleKind}</Tag>{' '}
        </>
      }
      <Text type="secondary">sample</Text>{' '}
    </Option>
  );
}

function renderIndividual(individual) {
  return (
    <Option key={'individual_' + individual.id}>
      <TeamOutlined />{' '}
      <strong>{individual.name}</strong>{' '}
      <Text type="secondary">individual</Text>{' '}
    </Option>
  );
}

function renderProject(project) {
  return (
    <Option key={'project_' + project.id}>
      <ProjectOutlined />{' '}
      <strong>{project.name}</strong>{' '}
      <Text type="secondary">project</Text>{' '}
    </Option>
  );
}

function renderUser(user) {
  return (
    <Option key={'user_' + user.id}>
      <UserOutlined />{' '}
      <strong>{user.username}</strong>{' '}
      <Text type="secondary">
        {[
          [user.first_name, user.last_name].join(' '),
          user.email
        ].filter(Boolean).join(' - ')}
      </Text>{' '}
      <Text type="secondary">user</Text>{' '}
    </Option>
  );
}

function loadLastItems() {
  try {
    if (localStorage['JumpBar__lastItems'])
      return JSON.parse(localStorage['JumpBar__lastItems'])
  } catch (e) {}
  return []
}

function pushItem(item) {
  if (!item)
    return
  lastItems = lastItems.filter(i => !itemEquals(item, i))
  lastItems.unshift(item)
  lastItems = lastItems.slice(0, 10)
  localStorage['JumpBar__lastItems'] = JSON.stringify(lastItems)
}

function itemEquals(a, b) {
  return a.type === b.type && a.item.id === b.item.id
}

export default connect(mapStateToProps)(JumpBar);
