import React from "react";
import {diff} from "jsondiffpatch";

import {SwapRightOutlined} from "@ant-design/icons";
import {Tag} from "antd";
import "antd/es/tag/style/css";

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
    if (key === "volume_history")
      return renderVolumeHistoryDelta(key, delta, oldVersion, newVersion);
    if (Array.isArray(delta))
      return renderArrayDelta(key, delta, oldVersion, newVersion);

    return renderUnknownDelta(key, delta, oldVersion, newVersion);
  });

  // for (let key in deltas) {
  //   let delta = deltas[key];
  //   if (key === 'volume_history')
  //     items.push(renderVolumeHistoryDelta(key, delta, oldVersion, newVersion));
  //   else if (Array.isArray(delta))
  //     items.push(renderArrayDelta(key, delta, oldVersion, newVersion));
  //   else
  //     items.push(renderUnknownDelta(key, delta, oldVersion, newVersion));
  // }

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

function renderVolumeHistoryDelta(name, delta, oldVersion, newVersion) {
  /*
   * Array with inner changes:
   *
   * delta = {
   *   _t: 'a',
   *   index1: innerDelta1,
   *   index2: innerDelta2,
   *   index5: innerDelta5
   * }
   *
   * example = {
   *   '2': [
   *     {
   *       update_type: 'update',
   *       volume_value: '0.001',
   *       date: '2020-05-25T20:38:33.012121Z'
   *     }
   *   ],
   *   _t: 'a'
   * }
   */

  const items = []
  const volumeHistory = newVersion.fields.volume_history

  for (let key in delta) {
    if (key === '_t')
      continue;

    if (/^\d+$/.test(key)) {
      const index = parseInt(key, 10)
      const currentVolume = volumeHistory[index]
      const previousVolume = volumeHistory[index - 1]
      items.push(
        <div key={name + '.' + key}>
          <code>volume:</code>{' '}
          {
            previousVolume &&
              <Tag color="red" style={removedStyle}>{previousVolume.volume_value}</Tag>
          }
          <SwapRightOutlined style={arrowStyle} />
          <Tag color="green" className='diff__added'>{currentVolume.volume_value} ({currentVolume.update_type})</Tag>
        </div>
      )
      continue;
    }

    items.push(renderUnknownDelta(key));
  }

  return items;
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
