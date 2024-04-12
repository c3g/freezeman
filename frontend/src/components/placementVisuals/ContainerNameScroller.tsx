import { Button, Tag, Typography } from "antd"
import React from "react"
const { Text, Title } = Typography;

interface ContainerNameScrollerProps {
    changeContainer: (direction: -1 | 1) => void,
    names: string[],
    index: number
}
//component used to display the container name, and also to cycle through the container list using callbacks
const ContainerNameScroller = ({ names, index, changeContainer }: ContainerNameScrollerProps) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', padding: "2px", justifyContent: 'space-between' }}>
            <Button disabled={index === 0 || names.length === 1} onClick={() => changeContainer(-1)}>
                Previous
            </Button>
            { 
              <Tag style={{ height: "32px", paddingTop: "3px", textAlign: 'center' }}><Text strong><Title level={5}>{names[index]}</Title></Text></Tag>
            }
            <Button disabled={index === names.length - 1 || names.length === 1} onClick={() => changeContainer(1)}>
                Next
            </Button >
        </div>
    )
}
export default ContainerNameScroller