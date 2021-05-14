import React from "react";
import {diff} from "jsondiffpatch";

import {SwapRightOutlined} from "@ant-design/icons";
import {Tag} from "antd";
import dateToString from "./dateToString";

const USER_ID_FIELDS = ["created_by", "updated_by"]
const DATE_FIELDS    = ["created_at", "updated_at"]

const removedStyle = {
  textDecoration: 'line-through',
}

const arrowStyle = {
  marginRight: 8,
}

export default function renderSampleDiff(oldVersion, newVersion, usersByID) {
  if (!oldVersion)
    return null;

  const deltas = diff(oldVersion.fields, newVersion.fields);

  if (deltas === undefined)
    return null;

  const items = Object.entries(deltas).map(([key, delta]) => {
    if (Array.isArray(delta))
      return renderArrayDelta(key, delta, oldVersion, newVersion, usersByID);
    else if (delta.constructor == Object)
      return renderJSONDelta(key, delta, oldVersion, newVersion);

    return renderUnknownDelta(key, delta, oldVersion, newVersion);
  });

  return (
    <div>{items}</div>
  );
}

function renderUnknownDelta(name, delta, oldVersion, newVersion) {
  // Invalid
  return (
    <div key={name}>
      <code>{name}:</code>{' '}
        <Tag color="red" >
          unknown modification (please report this): <code>{JSON.stringify(delta)}</code>
        </Tag>
    </div>
  );
}

function renderJSONDelta(key, delta, oldVersion, newVersion) {
  const oldValue = oldVersion.fields[key].toString();
  const newValue = newVersion.fields[key].toString();
  return (
    <div key={key}>
      <code>{key}:</code>{' '}
      <Tag color="red" style={removedStyle}>{oldValue}</Tag>
      <SwapRightOutlined style={arrowStyle} />
      <Tag color="green" className='diff__added'>{newValue}</Tag>
    </div>
  );
}


function renderArrayDelta(key, delta, oldVersion, newVersion, usersByID) {

  // ADDED: delta = [ newValue ]
  if (delta.length === 1)
    return (
      <div key={key}>
        <code>{key}:</code>{' '}
        <Tag color="green" className='diff__added'>{renderDeltaValue(delta[0], key, usersByID)}</Tag>
      </div>
    );

  /// MODIFIED: delta = [ oldValue, newValue ]
  if (delta.length === 2)
    return (
      <div key={key}>
        <code>{key}:</code>{' '}
        <Tag color="red" style={removedStyle}>{renderDeltaValue(delta[0], key, usersByID)}</Tag>
        <SwapRightOutlined style={arrowStyle} />
        <Tag color="green" className='diff__added'>{renderDeltaValue(delta[1], key, usersByID)}</Tag>
      </div>
    );

  /// DELETED: delta = [ oldValue, 0, 0 ]
  if (delta.length === 3 && delta[1] === 0 && delta[2] === 0)
    return (
      <div key={key}>
        <Tag color="red" style={removedStyle}>
          <code>{key}:</code> {renderDeltaValue(delta[0], key, usersByID)}
        </Tag>
      </div>
    );

  // Invalid
  return renderUnknownDelta(key, delta, oldVersion, newVersion)
}

function renderDeltaValue(value, key, usersByID) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  if (USER_ID_FIELDS.includes(key))
    return usersByID[value]?.username

  if (DATE_FIELDS.includes(key))
    return dateToString(value, 'full')

  return value.toString();
}
