import React from "react";

import {Typography} from "antd";
const {Text} = Typography


export function render(v) {
  return { value: v, label: v }
}

export function renderGroup(g) {
  return { value: g.id, label: g.name }
}

export function renderTaxon(t) {
  return {
    value: t.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {t.name}{' '}
        <Text type="secondary">NCBI:txid{t.ncbi_id}</Text>
      </div>
    )
  }
}

export function renderIndividual(i) {
  return {
    value: i.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {i.name}{' '}
        <Text type="secondary">{i.id}</Text>
      </div>
    )
  }
}

export function renderSampleKind(sk) {
  return {
    value: sk.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {sk.name}{' '}
        <Text type="secondary">{sk.id}</Text>
      </div>
    )
  }
}

export function renderContainer(c) {
  return {
    value: c.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {c.barcode}{' '}({c.name})
        <Text type="secondary">{c.kind}</Text>
      </div>
    )
  }
}

export function renderSample(s) {
  return {
    value: s.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>
          {s.name}{s.alias && <small> (alias: {s.alias})</small>}{' '}
        </span>
        <Text type="secondary">{s.id}</Text>
      </div>
    )
  }
}

export function renderInstrumentType(i) {
  return {
    value: i.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {i.type}
      </div>
    )
  }
}

export function renderMetadata(m) {
  return {
    value: m.name,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {m.name}
      </div>
    )
  }
}
