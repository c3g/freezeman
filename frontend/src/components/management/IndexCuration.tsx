import React from "react";
import PagedItemsTable, { DataObjectsByID, PagedItemsTableProps } from "../pagedItemsTable/PagedItemsTable";

export function IndexCuration() {


    return (
      <>
          {<AppPageHeader title="Containers" extra={[
            <ActionDropdown key='actions' urlBase={"/pooled-samples"} actions={templateActions}/>,
            <PrefilledTemplatesDropdown key='prefills' prefillTemplate={prefillTemplate} totalCount={totalCount} prefills={prefills}/>
            
            ]}/>
          <PagedItemsTable<ObjectWithPooledSample>
            getDataObjectsByID={mapSampleIDs}
            pagedItems={samplesTableState}
            columns={columns}
            usingFilters={true}
            initialLoad={false}
            selection={selection}
            topBarExtra={}
            paginationProps={{simple: true}}
            {...samplesTableCallbacks}
          />}
      </>
    )
}