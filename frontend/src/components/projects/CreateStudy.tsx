import React from 'react'
import CreateStudyForm from './CreateStudyForm'

import {fakeWorkflows} from './FakeWorkflows'

interface CreateStudyProps {
    project: any
}



const CreateStudy = ({project} : CreateStudyProps) => {
    return (
        <CreateStudyForm project={project} workflows={fakeWorkflows}/>
    )
}

export default CreateStudy