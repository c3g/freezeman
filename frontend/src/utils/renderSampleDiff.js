import React from "react";
import {diff} from "jsondiffpatch";

import {SwapRightOutlined} from "@ant-design/icons";
import {Tag} from "antd";

const removedStyle = {
  textDecoration: 'line-through',
}

const arrowStyle = {
  marginRight: 8,
}

export default function renderSampleDiff(oldVersion, newVersion) {
  if (!oldVersion)
    return null;

  const deltas = diff(oldVersion.fields, newVersion.fields);

  if (deltas === undefined)
    return null;

  delete deltas.update_comment;

  const items = Object.entries(deltas).map(([key, delta]) => {
    if (Array.isArray(delta))
      return renderArrayDelta(key, delta, oldVersion, newVersion);

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


function renderArrayDelta(name, delta, oldVersion, newVersion) {

  // ADDED: delta = [ newValue ]
  if (delta.length === 1)
    return (
      <div key={name}>
        <code>{name}:</code>{' '}
        <Tag color="green" className='diff__added'>{renderDeltaValue(delta[0])}</Tag>
      </div>
    );

  /// MODIFIED: delta = [ oldValue, newValue ]
  if (delta.length === 2)
    return (
      <div key={name}>
        <code>{name}:</code>{' '}
        <Tag color="red" style={removedStyle}>{renderDeltaValue(delta[0])}</Tag>
        <SwapRightOutlined style={arrowStyle} />
        <Tag color="green" className='diff__added'>{renderDeltaValue(delta[1])}</Tag>
      </div>
    );

  /// DELETED: delta = [ oldValue, 0, 0 ]
  if (delta.length === 3 && delta[1] === 0 && delta[2] === 0)
    return (
      <div key={name}>
        <Tag color="red" style={removedStyle}>
          <code>{name}:</code> {renderDeltaValue(delta[0])}
        </Tag>
      </div>
    );

  // Invalid
  return renderUnknownDelta(name, delta, oldVersion, newVersion)
}

function renderDeltaValue(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return value.toString();
}
