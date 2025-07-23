import React from "react";
import { FILTER_TYPE } from "../../constants";
import { FMSSampleIdentity, FMSSampleIdentityMatch } from "../../models/fms_api_models";
import { FilterDescription } from "../../models/paged_items";
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns";
import { UNDEFINED_FILTER_KEY } from "../pagedItemsTable/PagedItemsFilters";

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
        title: "Conclusive",
        dataIndex: ["identity", "conclusive"],
        width: 150,
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
        width: 150,
        sorter: true,
    },
    [SampleIdentityColumnID.SEX_CONCORDANCE]: {
        columnID: SampleIdentityColumnID.SEX_CONCORDANCE,
        title: "Sex Concordance",
        dataIndex: ["identity", "sex_concordance"],
        width: 170,
        sorter: true,
        render: (sexConcordance: FMSSampleIdentity['sex_concordance'] | undefined) => {
            if (sexConcordance === undefined) {
                return ""
            } else if (sexConcordance === null) {
                return "Unknown"
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
        sorter: true,
        render: (matches: FMSSampleIdentityMatch[] | undefined) => {
            if (!matches || matches.length === 0) {
                return []
            } else {
                return matches.map((match) => match.tested_biosample_id).reduce<React.ReactNode[]>((prev, curr) => {
                    if (prev.length === 0) {
                        prev.push(curr)
                    } else {
                        prev.push(", ", curr)
                    }
                    return prev
                }, [])
            }
        }
    },
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
        options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
        ],
    },
    [SampleIdentityColumnID.PREDICTED_SEX]: {
        type: FILTER_TYPE.SELECT,
        label: "Predicted Sex",
        key: UNDEFINED_FILTER_KEY,
        options: [
            { label: "Male", value: "M" },
            { label: "Female", value: "F" },
            { label: "Unknown", value: "Unknown" },
            { label: "Pending", value: "null" },
        ],
    },
    [SampleIdentityColumnID.SEX_CONCORDANCE]: {
        type: FILTER_TYPE.SELECT,
        label: "Sex Concordance",
        key: UNDEFINED_FILTER_KEY,
        options: [
            { label: "Match", value: "true" },
            { label: "Mismatch", value: "false" },
            { label: "Unknown", value: "null" },
        ]
    }
}

type SampleIdentityFilterKeys = SampleIdentityColumnID.ID | SampleIdentityColumnID.BIOSAMPLE | SampleIdentityColumnID.CONCLUSIVE | SampleIdentityColumnID.PREDICTED_SEX | SampleIdentityColumnID.SEX_CONCORDANCE;

export const SAMPLE_IDENTITY_FILTER_KEYS: Record<SampleIdentityFilterKeys, string> = {
    [SampleIdentityColumnID.ID]: "id",
    [SampleIdentityColumnID.BIOSAMPLE]: "biosample",
    [SampleIdentityColumnID.CONCLUSIVE]: "conclusive",
    [SampleIdentityColumnID.PREDICTED_SEX]: "predicted_sex",
    [SampleIdentityColumnID.SEX_CONCORDANCE]: "sex_concordance",
}