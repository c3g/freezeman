import React from "react";
import {connect} from "react-redux";
import dateToString from "../utils/dateToString";
import AppPageHeader from "./AppPageHeader";
import PageContainer from "./PageContainer";
import PageContent from "./PageContent";
import {Card, Col, Row} from "antd";


const mapStateToProps = state => ({
  info: state.base.info,
});

const CARD_PROPS = {
  size: "small",
};

const About = ({info}) => {
    const version = info.version;
    const repository = info.repository;
    const branch = info.branch;
    const commit = info.commit;
    const commitUrl = `${repository}/commit/${commit?.hash_full}`
    const branchUrl = `${repository}/tree/${branch}`

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
                Released under GNU LGPL version 3 © C3G, McGill University
                <br/>
                {(repository)?
                    <div>
                       <a target='_blank' href={repository}>{repository} </a>
                    </div>
                : ""}
              </Card>
              <div style={{ display: 'flex', marginBottom: '1em' }}></div>
              {(repository && commit && info.env != 'PROD' )?
                <Card title={`Environment ${info.env}`} {...CARD_PROPS}>
                  Commit: <a target='_blank' href={commitUrl}>#{commit.hash_small} </a>
                  <br/>
                    {(branch) ?
                        <>
                            Branch: <a target='_blank' href={branchUrl}>{branch} </a>
                            <br/>
                        </>
                        : ""
                    }
                  Last updated: {dateToString(commit.date)}
                </Card>
                : ""}
            </Col>
          </Row>
        </PageContent>
  </PageContainer>;
}

export default connect(mapStateToProps, {})(About);