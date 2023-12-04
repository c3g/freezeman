import { Input } from "antd"
import React from "react"

const ContainerNameScroller = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
            <button style={{ border: 'solid grey 1px' }}>
                Previous
            </button>
            <Input style={{ width: '50%' }}/>
            <button style={{ border: 'solid grey 1px' }}>
                Next
            </button >
        </div>
    )
}
export default ContainerNameScroller