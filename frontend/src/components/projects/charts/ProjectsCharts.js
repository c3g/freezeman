import { Pie } from '@ant-design/plots';
import { Card, DatePicker, Space, Spin, Typography } from "antd";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import api, { withToken } from "../../../utils/api";

const { RangePicker } = DatePicker
const { Text } = Typography

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
});

const ProjectsCharts = ({
  token,
  projectID,
}) => {
  return <>
    <Card
      title={"QC Statistics"}
    >
      <QCChart {...{ token, projectID }} />
    </Card>
  </>
}


function QCChart({ token, projectID }) {
  const defaultDates = [moment().subtract(1, 'month'), moment()]

  const [request, setRequest] = useState({
    isFetching: true,
    dates: defaultDates
  })
  const [data, setData] = useState([])

  const config = {
    data,
    animation: false,
    angleField: 'value',
    colorField: 'type',
    color: ({ type }) => {
      const colors = { awaiting: '#AAAAAA', failed: '#AA0000', passed: '#00AA00' };
      return colors[type]
    },
    radius: 1,
    label: {
      enable: false,
      content: ""
    },
    legend: {
      itemValue: {
        formatter: (_, item) => config.data.find((d) => d.type === item.value)?.value ?? 0
      }
    },
    interactions: [
      { type: 'tooltip', enable: false },
      { type: 'interaction-type', enable: false },
      { type: 'legend-filter', enable: false },
    ]
  }

  const [startDate, endDate] = request.dates

  useEffect(() => {
    if (projectID !== undefined && request.isFetching) {
      withToken(token, api.projects.qc_stats)(projectID, startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD")).then(({ data: stats }) => {
        const data = Object.values(stats).length > 0
          ? Object.values(stats).reduce((prev, curr) => {
            return prev.map(({ type, value }) => ({ type, value: value += curr[type] }))
          }, [
            { type: "awaiting", value: 0 },
            { type: "failed", value: 0 },
            { type: "passed", value: 0 },
          ])
          : []

        setData(data)
        setRequest({
          ...request,
          isFetching: false,
        })
      })
    }
  }, [projectID, request.isFetching])

  return <>
    <Space direction={"vertical"} align={"center"} size={"middle"}>
      <RangePicker
        onCalendarChange={(dates) => {
          setRequest((request) => (
            dates?.every((x) => x)
              ? {
                dates,
                isFetching: true
              }
              : request
          ))
        }}
        defaultValue={defaultDates}
      />
      {
        request.isFetching
          ? <Spin />
          : config.data.length > 0
            ? <Pie {...config} />
            : <Text>No samples found between {startDate.format("LL")} and {endDate.format("LL")}.</Text>
      }
    </Space>
  </>
}

export default connect(mapStateToProps, undefined)(ProjectsCharts);
