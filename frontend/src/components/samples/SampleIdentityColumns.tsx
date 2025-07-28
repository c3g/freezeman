import React, { useEffect } from "react";
import { FILTER_TYPE } from "../../constants";
import { FMSId, FMSSampleIdentity, FMSSampleIdentityMatch } from "../../models/fms_api_models";
import { FilterDescription } from "../../models/paged_items";
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns";
import { UNDEFINED_FILTER_KEY } from "../pagedItemsTable/PagedItemsFilters";
import { useAppDispatch } from "../../hooks";
import { list } from "../../modules/samples/actions";
import DropdownListItems from "../DropdownListItems";

export interface ObjectWithSampleIdentity {
    identity?: FMSSampleIdentity
}

export type SampleIdentityColumn = IdentifiedTableColumnType<ObjectWithSampleIdentity>

export enum SampleIdentityColumnID {
    ID = "ID",
    BIOSAMPLE = "BIOSAMPLE",
    CONCLUSIVE = "CONCLUSIVE",
    PREDICTED_SEX = "PREDICTED_SEX",
    SEX_CONCORDANCE = "SEX_CONCORDANCE",
    IDENTITY_MATCHES = "IDENTITY_MATCHES"
}

export const SAMPLE_IDENTITY_COLUMNS_DEFINITIONS: Record<SampleIdentityColumnID, SampleIdentityColumn> = {
    [SampleIdentityColumnID.ID]: {
        columnID: SampleIdentityColumnID.ID,
        title: "Sample ID",
        dataIndex: ["identity", "id"],
        width: 150,
        sorter: true,
    },
    [SampleIdentityColumnID.BIOSAMPLE]: {
        columnID: SampleIdentityColumnID.BIOSAMPLE,
        title: "BioSample",
        dataIndex: ["identity", "biosample_id"],
        width: 150,
        sorter: true,
    },
    [SampleIdentityColumnID.CONCLUSIVE]: {
        columnID: SampleIdentityColumnID.CONCLUSIVE,
        title: "Conclusive ID QC",
        dataIndex: ["identity", "conclusive"],
        width: 180,
        sorter: true,
        render: (conclusive: FMSSampleIdentity['conclusive'] | undefined) => {
            if (conclusive === undefined) {
                return ""
            } else if (conclusive) {
                return "Yes"
            } else {
                return "No"
            }
        }
    },
    [SampleIdentityColumnID.PREDICTED_SEX]: {
        columnID: SampleIdentityColumnID.PREDICTED_SEX,
        title: "Predicted Sex",
        dataIndex: ["identity", "predicted_sex"],
        width: 160,
        sorter: true,
    },
    [SampleIdentityColumnID.SEX_CONCORDANCE]: {
        columnID: SampleIdentityColumnID.SEX_CONCORDANCE,
        title: "Sex Concordance",
        dataIndex: ["identity", "sex_concordance"],
        width: 170,
        sorter: false,
        render: (sexConcordance: FMSSampleIdentity['sex_concordance'] | undefined) => {
            if (sexConcordance === undefined) {
                return ""
            } else if (sexConcordance === null) {
                return "Inconclusive"
            } else if (sexConcordance) {
                return "Match"
            } else {
                return "Mismatch"
            }
        }
    },
    [SampleIdentityColumnID.IDENTITY_MATCHES]: {
        columnID: SampleIdentityColumnID.IDENTITY_MATCHES,
        title: "Identity Matches",
        dataIndex: ["identity", "identity_matches"],
        width: 160,
        sorter: false,
        render: (matches: FMSSampleIdentityMatch[] | undefined) => {
            if (!matches || matches.length === 0) {
                return []
            } else {
                const aliases = matches.map((match, index) => <BiosampleIDToAlias key={index} biosampleID={match.matched_biosample_id} />)
                return <DropdownListItems listItems={aliases} />
            }
        }
    },
}

function BiosampleIDToAlias({ biosampleID }: { biosampleID: FMSId }): React.ReactNode {
    const [biosampleAlias, setBiosampleAlias] = React.useState<string | undefined>(undefined)
    const dispatch = useAppDispatch()
    useEffect(() => {
        dispatch(list({ derived_samples__biosample__id: biosampleID, limit: 1 })).then((response) => {
            const [sample] = response.results
            if (sample) {
                setBiosampleAlias(sample.alias)
            }
        })
    })
    return biosampleAlias
}
 
export const SAMPLE_IDENTITY_COLUMN_FILTERS: Partial<Record<SampleIdentityColumnID, FilterDescription>> = {
    [SampleIdentityColumnID.ID]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        label: "Sample Identity ID",
        key: UNDEFINED_FILTER_KEY,
    },
    [SampleIdentityColumnID.BIOSAMPLE]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        label: "BioSample",
        key: UNDEFINED_FILTER_KEY,
    },
    [SampleIdentityColumnID.CONCLUSIVE]: {
        type: FILTER_TYPE.SELECT,
        label: "Conclusive",
        key: UNDEFINED_FILTER_KEY,
        mode: 'multiple',
        options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
        ],
    },
    [SampleIdentityColumnID.PREDICTED_SEX]: {
        type: FILTER_TYPE.SELECT,
        label: "Predicted Sex",
        key: UNDEFINED_FILTER_KEY,
        mode: 'multiple',
        options: [
            { label: "Male", value: "M" },
            { label: "Female", value: "F" },
            { label: "Unknown", value: "Unknown" },
        ],
    }
}
