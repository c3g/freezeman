import { Select } from "antd"
import React, { useCallback, useState } from "react"

import * as Options from "../utils/options";
import api, { withToken } from "../utils/api";
import { selectAuthTokenAccess } from "../selectors";
import { useAppSelector } from "../hooks";

interface SearchContainerProps {
    exceptKinds: string[]
    handleOnChange: (value) => void
}

const SearchContainer = ({exceptKinds, handleOnChange}: SearchContainerProps) => {
    const token = useAppSelector(selectAuthTokenAccess)
    const searchContainers = (token, input, options) =>
        withToken(token, api.containers.search)(input, { sample_holding: true, except_kinds: exceptKinds.join(","), ...options }).then(res => res.data.results)

    const [containerOptions, setContainerOptions] = useState([]);
    const onFocusContainer = ev => { onSearchContainer(ev.target.value) }
    const onSearchContainer = useCallback((input, options?) => {
        searchContainers(token, input, options).then(containers => {
            setContainerOptions(containers.map(Options.renderContainer));
        })
    }, [token])

    return (
        <div style={{ width: "100%" }}>
            <Select
                onChange={handleOnChange}
                style={{width: "100%"}}
                showSearch
                allowClear
                filterOption={false}
                options={containerOptions}
                onSearch={onSearchContainer}
                onFocus={onFocusContainer}
            />
        </div>
    );
}

export default SearchContainer