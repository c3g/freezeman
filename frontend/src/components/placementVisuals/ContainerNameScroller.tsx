import { Button, Tag, Typography } from "antd"
import React, { useMemo } from "react"
const { Text } = Typography;

interface ContainerNameScrollerProps {
    changeContainer: (direction: -1 | 1) => void,
    names: (string | null)[],
    name: string | null
}
//component used to display the container name, and also to cycle through the container list using callbacks
const ContainerNameScroller = ({ names, name, changeContainer }: ContainerNameScrollerProps) => {
    const index = useMemo(() => names.findIndex((x) => x === name), [name, names])

    return (
        <div className={"container-name-scroller"} style={{ display: 'flex', flexDirection: 'row', padding: "2px", justifyContent: 'space-between', gap: '1em', width: '100%' }}>
            <Button disabled={index === 0 || names.length === 1} onClick={() => changeContainer(-1)}>
                Previous
            </Button>
            <Tag variant="outlined" style={{ height: "32px", paddingTop: "3px", textAlign: 'center', marginRight: '0' }}><Text strong style={{ fontSize: '1.125rem' }}>{names[index] ?? 'Tubes without parent'}</Text></Tag>
            <Button disabled={index === names.length - 1 || names.length === 1} onClick={() => changeContainer(1)}>
                Next
            </Button >
        </div>
    )
}
export default ContainerNameScroller