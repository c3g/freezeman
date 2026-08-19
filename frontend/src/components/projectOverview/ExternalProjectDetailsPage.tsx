import { Alert, Tabs, Typography } from 'antd'
import FlexBar from '../shared/Flexbar'

import React, { useCallback, useState, useEffect} from 'react'

import useHashURL from '../../hooks/useHashURL'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'

import ProjectSubmissionsTab from './ProjectSubmissionsTab'

import api from '../../utils/api'


import { useAppDispatch} from '../../hooks'
import { useParams } from 'react-router-dom'
import { FMSParentProject, FMSProject } from '../../models/fms_api_models'


// Convertit en nombre l’ID du projet parent reçu dans l’URL.
const parseParentProjectID = (parentProjectID: string,): number => {
    return Number(parentProjectID)
}


const ExternalProjectDetailsPage = () => {

    const { parentProjectId: paramParentProjectId } = useParams()
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
            setParentProject(null)
            setInternalProjects([])
            setError('Invalid parent project ID')
            return
        }

	    fetchParentProjectWithInternalProjects(parentProjectId)

    }, [parentProjectId,fetchParentProjectWithInternalProjects,])


    const [activeKey, setActiveKey] = useHashURL('submissions')
    const externalID = parentProject?.external_id ?? ''
    
        
    return (
        <>
            <AppPageHeader title={parentProject ? `Project Overview : (External ID ${externalID})`: 'Project Overview'}/>

            <PageContent tabs>

                {error && (	<Alert type="error"	title={error}	style={{ marginBottom: 16 }} />)}

                <FlexBar style={{ alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginBottom: 16 }}>
                    <Typography.Text strong style={{ fontSize: 18 }}>{parentProject?.name}</Typography.Text>
                  
                </FlexBar>

                <Tabs
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    size="large"
                    type="card"
                    items={[
                        {
                            label: 'Associated Freezeman Projects',
                            key: 'submissions',
                            children: (
                               <ProjectSubmissionsTab
                                    internalProjects={internalProjects}
                                    isLoading={isLoading}
                                    externalID={externalID}
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
