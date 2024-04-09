import { Input, Button, Tag, Typography } from "antd"
import React from "react"
const { Text, Title } = Typography;

interface ContainerNameScrollerProps {
    changeContainer: (direction: -1 | 1) => void,
    name: string,
    disabled: boolean
}
//component used to display the container name, and also to cycle through the container list using callbacks
const ContainerNameScroller = ({ name, changeContainer, disabled}: ContainerNameScrollerProps) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', padding: "2px", justifyContent: 'space-between' }}>
            <Button disabled={disabled} onClick={() => changeContainer(-1)}>
                Previous
            </Button>
            { 
              <Tag style={{ height: "32px", paddingTop: "3px", textAlign: 'center' }}><Text strong><Title level={5}>{name}</Title></Text></Tag>
            }
            <Button disabled={disabled} onClick={() => changeContainer(1)}>
                Next
            </Button >
        </div>
    )
}
export default ContainerNameScroller