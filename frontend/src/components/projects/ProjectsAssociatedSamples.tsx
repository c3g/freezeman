import React from "react";
import { Project } from "../../models/frontend_models"
import { LabworkSamples } from "../labwork/samples/LabworkSamples";
import { useAppSelector } from "../../hooks";
import { selectProjectsByID } from "../../selectors";
import { SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SampleColumnID } from "../samples/SampleTableColumns";

export interface ProjectsAssociatedSamplesProps {
    projectID: Project['id']
}

export const ProjectsAssociatedSamples = ({ projectID: currentProjectID }: ProjectsAssociatedSamplesProps) => {
    const projectName = useAppSelector((state) => selectProjectsByID(state)[currentProjectID]?.name);
    if (projectName) {
        return <LabworkSamples fixedFilter={{ value: projectName, description: {
            ...SAMPLE_COLUMN_FILTERS[SampleColumnID.PROJECT],
            key: SAMPLE_FILTER_KEYS[SampleColumnID.PROJECT]
        } }} />
    } else {
        return <></>
    }
 }

export default ProjectsAssociatedSamples;
