import React from "react";
import AppPageHeader from "./AppPageHeader";
import PageContainer from "./PageContainer";
import PageContent from "./PageContent";
import {Card, Col, Row} from "antd";

const REPOSITORY = "https://github.com/c3g/freezeman"


const COL_LAYOUT = {
  lg: 8,
  xs: 24,
  style: {marginTop: "16px", marginRight: "12px"}
};


const About = () => {
    const commit = GIT_COMMITHASH
    const branch = GIT_BRANCH
    const lastUpdate = GIT_LASTUPDATE
    const version = FMS_VERSION
    const env = FMS_ENV

    const commitUrl = `${REPOSITORY}/commit/${commit}`
    const branchUrl = `${REPOSITORY}/tree/${branch}`
    const shortCommit = commit.slice(0,8)

    return <PageContainer>
        <AppPageHeader title="About" />
        <PageContent style={{padding: "0 24px 24px 24px"}}>
            <Row>
                <Col {...COL_LAYOUT}>
                    <Card title="Information" size="large">
                      FreezeMan
                      <br/>
                      {version && `Version ${version}`}
                      <br/>
                      Released under GNU LGPL version 3 © C3G, McGill University
                      <br/>
                      {REPOSITORY &&
                            <a target='_blank' href={REPOSITORY} rel="noopener noreferer">{REPOSITORY}</a>
                      }
                    </Card>
                </Col>
                {REPOSITORY && commit &&
                    <Col {...COL_LAYOUT}>
                        <Card title={`Environment ${env}`} size="large">
                          Commit: <a target='_blank' href={commitUrl}>#{shortCommit} </a>
                          <br/>
                            {branch &&
                                <>
                                    Branch: <a target='_blank' href={branchUrl} rel="noopener noreferer">{branch} </a>
                                    <br/>
                                </>
                            }
                          Last updated: {lastUpdate}
                        </Card>
                    </Col>
                }
          </Row>
        </PageContent>
  </PageContainer>;
}

export default About;