import React, { useState, useEffect } from 'react'
import { Select, Input, Form, Button, Space, Tooltip } from 'antd'
import { MinusCircleOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useAppSelector } from '../../../hooks'

// import FilterLabel from './FilterLabel'
// import * as style from './style'

import api, { withToken } from '../../../utils/api'
import * as Options from '../../../utils/options'
import { selectAuthTokenAccess } from '../../../selectors'
import { FilterDescription, SetFilterFunc } from '../../../models/paged_items'

const searchMetadata = (token, input, options) => withToken(token, api.sampleMetadata.search)(input, options).then((res) => res.data)

interface MetadataFilterProps {
	description: FilterDescription
	value: any
	setFilter: SetFilterFunc
}

const MetadataFilter = ({ description, value, setFilter }: MetadataFilterProps) => {

	const token = useAppSelector(selectAuthTokenAccess)

	const [metadataName, setMetadataName] = useState([])
	const [form] = Form.useForm()
	const initialValues = { fields: value }

	const [metadataOptions, setMetadataOptions] = useState([])
	const onFocusMetadata = (ev) => {
		onSearchMetadata(ev.target.value)
	}
	const onSearchMetadata = (input, options = {}) => {
		searchMetadata(token, input, options).then((metadata) => {
			setMetadataOptions(metadata.map(Options.renderMetadata))
		})
	}

	// Metadata Name
	const onNameChange = (name) => {
		setMetadataName(name)
	}

	// Property Value, which applies the filter
	const onApplyFilter = (values) => {
		if (values.fields) {
			// onChange(description, values.fields)
			setFilter(description.key, values.fields, description)
		}
	}

	// Reset form when filters are cleared
	useEffect(() => {
		if (value === undefined) {
			form.resetFields()
		}
	}, [value])

	return (
		<>
			<Form form={form} initialValues={initialValues} onFinish={onApplyFilter}>
				<div style={{ display: 'grid', marginTop: '5px', minWidth: '200px' }}>
					<Form.List name="fields">
						{(fields, { add, remove }) => (
							<>
								{fields.map(({ key, name }) => (
									<Space key={key} style={{ display: 'flex', marginBottom: '-5px' }} align="baseline">
										<Form.Item name={[name, 'name']} rules={[{ required: true, message: 'Missing name' }]}>
											<Select
												size="small"
												style={{ width: 200 }}
												placeholder="Name"
												showSearch
												allowClear
												filterOption={false}
												options={metadataOptions}
												onSearch={onSearchMetadata}
												onFocus={onFocusMetadata}
												onChange={onNameChange}
												value={metadataName}
											/>
										</Form.Item>
										<Tooltip title="Leave the value field empty to search for any sample with the given metadata field.">
											<QuestionCircleOutlined />
										</Tooltip>
										<Form.Item name={[name, 'value']}>
											<Input size="small" placeholder="Value" />
										</Form.Item>
										<Tooltip title="Remove metadata field.">
											<MinusCircleOutlined onClick={() => remove(name)} />
										</Tooltip>
									</Space>
								))}
								<Form.Item style={{ marginBottom: '5px' }}>
									<Button size="small" type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
										Add metadata field
									</Button>
								</Form.Item>
							</>
						)}
					</Form.List>
					<Form.Item style={{ marginBottom: '5px' }}>
						<Button size="small" type="primary" htmlType="submit">
							Apply Filter
						</Button>
					</Form.Item>
				</div>
			</Form>
		</>
	)
}

export default MetadataFilter
