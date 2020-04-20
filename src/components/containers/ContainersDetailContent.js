import React from "react";
import {connect} from "react-redux";
import {useParams} from "react-router-dom";

import AppPageHeader from "../AppPageHeader";
import ContainerHierarchy from "./ContainerHierarchy";
import PageContent from "../PageContent";

const ContainersDetailContent = ({containersByBarcode}) => {
    const {barcode} = useParams();
    const container = containersByBarcode[barcode];

    // TODO: Load container if not loaded
    if (!container) return null;

    // TODO: More data (kind tag, barcode, etc.)
    return <>
        <AppPageHeader title={container.name} />
        <PageContent>
            TODO
            <ContainerHierarchy container={container} />
        </PageContent>
    </>;
};

const mapStateToProps = state => ({
    containersByBarcode: state.containers.itemsByBarcode,
});

export default connect(mapStateToProps)(ContainersDetailContent);
