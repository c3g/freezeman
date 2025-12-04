import React, { useEffect, useMemo, useState } from "react";
import { FMSId, FMSSampleIdentity, FMSSampleIdentityMatch, FMSVersion } from "../../../models/fms_api_models";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { selectLibrariesByID, selectSampleKindsByID, selectSamplesByID, selectUsersByID } from "../../../selectors";
import { LoadingOutlined, UserOutlined } from "@ant-design/icons";
import { Descriptions, Table, Row, Col, Card, Empty, Timeline, DescriptionsProps, TableProps, Typography, TimelineItemProps } from "antd";
import { Link } from "react-router-dom";
import { isNullish } from "../../../utils/functions";
import renderSampleDiff from "../../../utils/renderSampleDiff";
import { Depletion } from "../../Depletion";
import { QCFlag } from "../../QCFlag";
import { WithIndividualRenderComponent, WithContainerRenderComponent, WithCoordinateRenderComponent, WithSampleRenderComponent, WithIndexRenderComponent } from "../../shared/WithItemRenderComponent";
import TrackingFieldsContent from "../../TrackingFieldsContent";
import api from "../../../utils/api";
import { BiosampleIDToAlias } from "../SampleIdentityColumns";
import useTimeline from "../../../utils/useTimeline";
import dateToString from "../../../utils/dateToString";
import { Sample, SampleVersion } from "../../../models/frontend_models";
import { preprocessSampleVersions } from "../../../utils/preprocessRevisions";

const { Title, Text } = Typography

interface SampleDetailsContentOverviewProps {
    sampleID: FMSId
}

export default function SampleDetailsContentOverview({ sampleID }: SampleDetailsContentOverviewProps) {
    const dispatch = useAppDispatch()
    const [timelineMarginLeft, timelineRef] = useTimeline();

    const sampleKindsByID = useAppSelector(selectSampleKindsByID)
    const usersByID = useAppSelector(selectUsersByID)

    const sample = useAppSelector(state => selectSamplesByID(state)[sampleID]) as Sample | undefined
    const sampleKind = sample ? sampleKindsByID[sample.sample_kind]?.name ?? (sample.is_pool ? "Pool" : "") : ""
    const tissueSource = sample && sample.tissue_source ? sampleKindsByID[sample.tissue_source]?.name : undefined
    const volume = sample && (isNullish(sample.volume) ? '' : sample.volume.toFixed(3))
    const experimentalGroups = sample?.experimental_group ?? []
    const flags = useMemo(() => sample ? ({ quantity: sample.quantity_flag, quality: sample.quality_flag, identity: sample.identity_flag }) : {} as Record<string, undefined>, [sample])

    const [versions, setVersions] = useState<SampleVersion[]>()
    useEffect(() => {
        dispatch(api.samples.listVersions(sampleID)).then(({ data }) => {
            setVersions(preprocessSampleVersions(data))
        })
    }, [dispatch, sampleID])

    const library = useAppSelector(state => selectLibrariesByID(state)[sampleID])
    const quantity = library && library.quantity_ng ? library.quantity_ng.toFixed(3) : undefined
    const concentration_nm = library && library.concentration_nm ? library.concentration_nm.toFixed(3) : undefined

    const [sampleIdentity, setSampleIdentity] = useState<FMSSampleIdentity>()
    useEffect(() => {
        const biosampleId = sample?.biosample_id
        if (biosampleId) {
            const identities = dispatch(api.sampleIdentity.list({ "biosample": biosampleId }))
            identities.then(({ data }) => {
                if (data.count > 0) {
                    setSampleIdentity(data.results[0])
                }
            })
        }
    }, [dispatch, sample?.biosample_id, setSampleIdentity])
    const sampleIdentityItems = useMemo(() => {
        const items: NonNullable<DescriptionsProps['items']> = [
            {
                label: "Conclusive",
                key: "conclusive",
                children: sampleIdentity?.conclusive === undefined
                    ? ""
                    : sampleIdentity.conclusive ? "Yes" : "No"
            },
            {
                label: "Predicted Sex",
                key: "predicted_sex",
                children: sampleIdentity?.predicted_sex ?? ""
            },
            {
                label: "Sex Concordance",
                key: "sex_concordance",
                children: sampleIdentity?.sex_concordance === undefined
                    ? ""
                    : sampleIdentity.sex_concordance === null
                        ? "Inconclusive"
                        : sampleIdentity.sex_concordance ? "Match" : "Mismatch"
            },
        ]
        return items
    }, [sampleIdentity])
    const sampleIdentityMatchesColumns = useMemo(() => {
        const columns: NonNullable<TableProps<FMSSampleIdentityMatch>['columns']> = [
            {
                title: "Matching Biosample (Alias)",
                dataIndex: "matched_biosample_id",
                key: "biosample_alias",
                render: (matched_biosample_id) => {
                    return <BiosampleIDToAlias biosampleID={matched_biosample_id} />
                }
            },
            {
                title: "Matching Site Ratio",
                dataIndex: "matching_site_ratio",
                key: "matching_site_ratio"
            },
            {
                title: "Compared Sites",
                dataIndex: "compared_sites",
                key: "compared_sites"
            }
        ]
        return columns
    }, [])


    const render: React.ReactNode[] = []

    if (sample) {
        render.push(
            <Descriptions bordered={true} size="small" key={'sample'}>
                <Descriptions.Item label="ID">{sample.id}</Descriptions.Item>
                <Descriptions.Item label="Name">{sample.name}</Descriptions.Item>
                <Descriptions.Item label="Alias">{sample.alias}</Descriptions.Item>
                <Descriptions.Item label="Sample Kind">{sampleKind}</Descriptions.Item>
                <Descriptions.Item label="Volume (µL)">{volume}</Descriptions.Item>
                <Descriptions.Item label="Concentration (ng/µL)">
                    {sample.concentration == null
                        ? "—"
                        : `${sample.concentration.toFixed(3)}`}
                </Descriptions.Item>
                <Descriptions.Item label="Depleted"><Depletion depleted={sample.depleted} /></Descriptions.Item>
            </Descriptions>,
            <Descriptions bordered={true} size="small" style={{ marginTop: "24px" }} key={'individual'}>
                <Descriptions.Item label="Individual Name">
                    {sample.individual &&
                        <Link to={`/individuals/${sample.individual}`}>
                            <WithIndividualRenderComponent objectID={sample.individual} render={(individual) => individual.name} placeholder={"Loading..."} />
                        </Link>
                    }
                </Descriptions.Item>
                <Descriptions.Item label="Collection Site">{sample.collection_site}</Descriptions.Item>
                <Descriptions.Item label="Tissue Source">{tissueSource}</Descriptions.Item>
                <Descriptions.Item label="Experimental Groups" span={2}>
                    {experimentalGroups.map((g, i) =>
                        <span key={g}>{g}{i === experimentalGroups.length - 1 ? "" : ", "}</span>)}
                </Descriptions.Item>
                <Descriptions.Item label="Reception/Creation Date">{sample.creation_date}</Descriptions.Item>
                <Descriptions.Item label="Container Barcode">
                    {sample.container &&
                        <Link to={`/containers/${sample.container}`}>
                            <WithContainerRenderComponent objectID={sample.container} render={(container) => container.barcode} placeholder={"Loading..."} />
                        </Link>
                    }
                </Descriptions.Item>
                <Descriptions.Item label="Coordinates">
                    {sample.coordinate
                        ? <WithCoordinateRenderComponent objectID={sample.coordinate} render={(coordinate) => coordinate.name} placeholder={"Loading..."} />
                        : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="QC Flag">
                    {!isNullish(flags.quantity) || !isNullish(flags.quality) || !isNullish(flags.identity)
                        ? <QCFlag flags={flags} />
                        : null}
                </Descriptions.Item>
                <Descriptions.Item label="Comment" span={3}>{sample.comment}</Descriptions.Item>
            </Descriptions>
        )

        if (sample.extracted_from) {
            render.push(
                <Descriptions bordered={true} size="small" title="Extraction Details" style={{ marginTop: "24px" }} key={'extraction'}>
                    <Descriptions.Item label="Extracted From">
                        <Link to={`/samples/${sample.extracted_from}`}>
                            <WithSampleRenderComponent objectID={sample.extracted_from} render={(sample) => sample.name} placeholder={"Loading..."} />
                        </Link>
                        {" ("}
                        <WithSampleRenderComponent objectID={sample.extracted_from} render={(sample) => <WithContainerRenderComponent
                            objectID={sample.container} render={(container) => container.barcode} placeholder={"..."}
                        />} placeholder={"..."} />
                        <WithSampleRenderComponent objectID={sample.extracted_from} render={(sample) => <WithCoordinateRenderComponent
                            objectID={sample.coordinate} render={(coordinates) => ` at ${coordinates.name}`}
                        />} />
                        {")"}
                    </Descriptions.Item>
                </Descriptions>
            )
        }

        if (sample.is_library) {
            render.push(
                <div key={'library'}>
                    <Title level={5} style={{ marginTop: '1rem' }}> Library Information </Title>
                    <Descriptions bordered={true} size="small">
                        <Descriptions.Item label="Library Type">{library?.library_type}</Descriptions.Item>
                        <Descriptions.Item label="Platform">{library?.platform}</Descriptions.Item>
                        <Descriptions.Item label="Index">
                            {library?.index &&
                                <Link to={`/indices/${library?.index}`}>
                                    <WithIndexRenderComponent objectID={library?.index} render={(index) => index.name} placeholder={"Loading..."} />
                                </Link>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Library Size (bp)">{sample?.fragment_size}</Descriptions.Item>
                        <Descriptions.Item label="Concentration (nM)">{library?.concentration_nm && concentration_nm}</Descriptions.Item>
                        <Descriptions.Item label="NA Quantity (ng)">{library?.quantity_ng && quantity}</Descriptions.Item>
                    </Descriptions>
                    <Descriptions bordered={true} size="small" style={{ marginTop: "24px" }}>
                        <Descriptions.Item label="Library Selection Method">{library?.library_selection}</Descriptions.Item>
                        <Descriptions.Item label="Library Selection Target">{library?.library_selection_target}</Descriptions.Item>
                    </Descriptions>
                </div>
            )
        }
    }

    if (sampleIdentity) {
        render.push(
            <div key={'identity-qc'}>
                <Title level={5} style={{ marginTop: '1rem' }}> Identity QC </Title>
                    <Descriptions bordered={true} size="small" column={3} items={sampleIdentityItems} />
                    <div style={{ marginTop: '1rem' }} />
                    {sampleIdentity.identity_matches.length > 0 &&
                        <Table dataSource={sampleIdentity.identity_matches} columns={sampleIdentityMatchesColumns} size={"small"} pagination={false} />}
            </div>
        )
    }

    render.push(
        <TrackingFieldsContent entity={sample} key={'tracking-fields-content'} />
    )

    render.push(<Title level={2} style={{ marginTop: '1rem' }} key={'versions-title'}>Versions</Title>)
    render.push(
        <Row key={'versions-timeline'}>
            <Col sm={24} md={24}>
                <div ref={timelineRef}>
                    <Card>
                        {
                            versions?.length === 0
                            ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            : <Timeline
                                mode="left"
                                style={{ marginLeft: timelineMarginLeft }}
                                items={
                                    versions === undefined
                                    ? [{ dot: <LoadingOutlined />, label: " ", children: "Loading..." }]
                                    : versions.reduce<TimelineItemProps[]>((acc, version, i) => {
                                        const diff = renderSampleDiff(versions[i + 1], version, usersByID)
                                        if (!diff)
                                            return acc
                                        acc.push({
                                            key: i,
                                            label: renderTimelineLabel(version, usersByID),
                                            children: (
                                                <>
                                                    <strong>{version.revision.comment}</strong>
                                                    {diff}
                                                </>
                                            )
                                        })
                                        return acc
                                    }, [])
                                }
                            />
                        }
                    </Card>
                </div>
            </Col>
        </Row>
    )

    return render
}

const usernameStyle = {
  cursor: 'default',
}

function renderTimelineLabel(version: FMSVersion, usersByID: ReturnType<typeof selectUsersByID>) {
    const user = version.revision.user ? usersByID[version.revision.user] : undefined
    const username = user?.username ?? "Loading...";

    return (
        <div>
            <div><Text type="secondary">{dateToString(version.revision.date_created)}</Text></div>
            <div><Text disabled style={usernameStyle}><UserOutlined /> {username}</Text></div>
        </div>
    )
}