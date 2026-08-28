import { Alert, Tabs,} from 'antd'

import React, { useCallback, useState, useEffect} from 'react'

import useHashURL from '../../hooks/useHashURL'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'

import ProjectSubmissionsTab from './ProjectSubmissionsTab'
import ProjectReadSetsTab from './ProjectReadSetsTab'

import api from '../../utils/api'

import { useAppDispatch} from '../../hooks'
import { useParams,useNavigate } from 'react-router-dom'
import { FMSParentProject, FMSProject } from '../../models/fms_api_models'

const MAX_PROJECT_NAME_LENGTH = 60

// Convertit en nombre l’ID du projet parent reçu dans l’URL.
const parseParentProjectID = (parentProjectID: string,): number => {
    return Number(parentProjectID)
}

const ExternalProjectDetailsPage = () => {

    const { parentProjectId: paramParentProjectId } = useParams()
    const navigate = useNavigate()
    const parentProjectId = paramParentProjectId ? parseParentProjectID(paramParentProjectId) : null

    const [parentProject, setParentProject] = useState<FMSParentProject | null>(null)
    const [internalProjects, setInternalProjects] =	useState<FMSProject[]>([])
    const [isLoading, setIsLoading] =  	useState(false)
    const [error, setError] = useState<string | null>(null)
    
    
    const dispatch = useAppDispatch()

    // Charge depuis l’API le projet parent correspondant à l’ID reçu.
    const fetchParentProject = useCallback(async (parentProjectId: number,): Promise<FMSParentProject> => {
            const response = await dispatch(api.parentProjects.get(parentProjectId),)
            return response.data
        },[dispatch],
    )

    // Charge les projets internes correspondant aux IDs associés au projet parent.
    const fetchInternalProjectsByIDs = useCallback(async (projectIDs: number[],): Promise<FMSProject[]> => {
            if (projectIDs.length === 0) {return []}
            const response = await dispatch(
                api.projects.list(
                    {
                        id__in: projectIDs.join(','),
                        limit: 100000,
                    },
                    true,
                ),
            )

            return response.data.results
        },[dispatch],
    )

    // Charge le projet parent et tous les projets internes qui lui sont associés.
    const fetchParentProjectWithInternalProjects = useCallback(
        async (parentProjectId: number): Promise<void> => {
            try {
                setIsLoading(true)
                setError(null)

                const fetchedParentProject = await fetchParentProject(parentProjectId)
                setParentProject(fetchedParentProject)

                const internalProjectIDs = fetchedParentProject.projects ?? []
                const fetchedInternalProjects = await fetchInternalProjectsByIDs(internalProjectIDs,)
                setInternalProjects(fetchedInternalProjects)
            }
            catch (requestError) {
                setParentProject(null)
                setInternalProjects([])

                if (
                    !(
                        requestError instanceof Error &&
                        requestError.name === 'AbortError'
                    )
                ) {
                    setError(
                        'Unable to fetch the external project',
                    )
                }
            }
            finally {
                setIsLoading(false)
            }
        },[fetchParentProject,fetchInternalProjectsByIDs,],
    )

    useEffect(() => {
        if (parentProjectId === null) {
          	navigate('/external-projects-overview', {
		        replace: true,
	        })
	    return
        }

	    fetchParentProjectWithInternalProjects(parentProjectId)

    }, [parentProjectId,fetchParentProjectWithInternalProjects,navigate])


    const [activeKey, setActiveKey] = useHashURL('projects')
    const externalID = parentProject?.external_id ?? ''

    const projectName = parentProject?.name ?? ''

    const displayedProjectName =
        projectName.length > MAX_PROJECT_NAME_LENGTH
            ? `${projectName.slice(0, MAX_PROJECT_NAME_LENGTH)}…`
            : projectName
    
        
    return (
        <>
            <AppPageHeader title={parentProject  ? `Project Overview: ${displayedProjectName} (External ID: ${externalID})`: 'Project Overview'}/>

            <PageContent tabs>

                {error && (	<Alert type="error"	title={error}	style={{ marginBottom: 16 }} />)}


                <Tabs
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    size="large"
                    type="card"
                    items={[
                        {
                            label: 'Associated Freezeman Projects',
                            key: 'projects',
                            children: (
                               <ProjectSubmissionsTab
                                    internalProjects={internalProjects}
                                    isLoading={isLoading}
                                    externalID={externalID}
                                />
                            ),
                        },
                        { 
                            label: 'Read Sets',
                            key: 'readsets',
                            children: (
                                <ProjectReadSetsTab
                                    parentProjectId={parentProjectId}
                                    externalID={externalID}                                   
                                    isActive={activeKey === 'readsets'}
                                />
                            ),
                        },

                    ]}
                />
            </PageContent>
        </>
    )
}

export default ExternalProjectDetailsPage
