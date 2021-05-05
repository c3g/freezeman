import React from "react";
import AppPageHeader from "./AppPageHeader";
import PageContainer from "./PageContainer";
import PageContent from "./PageContent";
import {Card, Col, Row} from "antd";

const REPOSITORY = "https://github.com/c3g/freezeman"

const CARD_PROPS = {
  size: "small",
};

const About = () => {
    const commit = COMMITHASH
    const branch = BRANCH

    const commitUrl = `${REPOSITORY}/commit/${commit}`
    const branchUrl = `${REPOSITORY}/tree/${branch}`
    const shortCommit = commit.slice(0,8)

    const version = VERSION
    const lastUpdate = LASTUPDATE

    const env = ENVTYPE;

    return <PageContainer>
        <AppPageHeader title="About" />
        <PageContent style={{padding: "0 24px 24px 24px"}}>
            <Row>
                <Col style={{marginTop: "16px"}}>
                <Card title="Information" {...CARD_PROPS}>
                  FreezeMan
                  <br/>
                  {(version ? `Version ${version}` : '')}
                  <br/>
                  Released under GNU LGPL version {version} © C3G, McGill University
                  <br/>
                  { REPOSITORY &&
                       <div>
                           <a target='_blank' href={REPOSITORY}>{REPOSITORY} </a>
                        </div>
                  }
              </Card>
              <div style={{ display: 'flex', marginBottom: '1em' }}></div>
              {(REPOSITORY && commit && env != 'PROD' )?
                <Card title={`Environment ${env}`} {...CARD_PROPS}>
                  Commit: <a target='_blank' href={commitUrl}>#{shortCommit} </a>
                  <br/>
                    {(branch) ?
                        <>
                            Branch: <a target='_blank' href={branchUrl}>{branch} </a>
                            <br/>
                        </>
                        : ""
                    }
                  Last updated: {lastUpdate}
                </Card>
                : ""}
            </Col>
          </Row>
        </PageContent>
  </PageContainer>;
}

export default About;