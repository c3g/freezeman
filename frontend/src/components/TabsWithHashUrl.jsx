
import React from 'react'
import { Tabs } from 'antd'
import useHashURL from '../hooks/useHashURL'

/**
 * Creates an antd Tabs component that automatically updates the location url
 * with the currently selected tab, appending the tab's key value to the location,
 * eg., if the metadata tab is selected in sample details page, the url will be set
 * to: /samples/123#metadata
 * 
 * To use it, specify the default tab key value for the Tabs (eg. "overview") with
 * the `defaultActiveKey` prop, along with whichever Tabs props you want to use.
 * @param {*} param0 
 * @returns 
 */
 export const TabsWithHashURL = ({defaultActiveKey, children, ...rest}) => {
    const [activeKey, setActiveKey] = useHashURL(defaultActiveKey)

    const onChangeActiveKey = (activeKey) => {setActiveKey(activeKey)}

    return (
        <Tabs defaultActiveKey={defaultActiveKey} activeKey={activeKey} onChange={onChangeActiveKey} {...rest}>
            {children}
        </Tabs>
    )
}