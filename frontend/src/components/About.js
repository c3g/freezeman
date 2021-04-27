import React from "react";
import {Link} from "react-router-dom";
import {connect} from "react-redux";

const mapStateToProps = state => ({
  info: state.base.info,
});

const actionCreators = {};

const About = ({info}) => {
    const version = info.version;
    const repository = info.repository;
    const commit = info.commit;
    const commitUrl = `${repository}/commit/${commit?.hash_full}`
    return <>
        <div>FreezeMan</div>
        {(version)?
            <div>Version {version}</div>
        : ""}
        <div>Released under GNU LGPL version 3 © C3G, McGill University</div>
        {(repository)?
            <div>
               <a target='_blank' href={repository}>{repository} </a>
            </div>
        : ""}

        {(repository && commit && info.env != 'PROD' )?
          <div>
              <a target='_blank' href={commitUrl}>#{commit.hash_small} </a>
              ({commit.date})
          </div>
        : ""}
    </>;
}

export default connect(mapStateToProps, actionCreators)(About);