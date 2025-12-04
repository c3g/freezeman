import { createContext } from "react";


type ValueType = { itemsCount: number; options: any }

const ListExportContext = createContext<[
    ValueType,
    React.Dispatch<React.SetStateAction<ValueType>>
] | []>([])

    export default ListExportContext