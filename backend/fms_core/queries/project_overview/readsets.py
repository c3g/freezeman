PROJECT_OVERVIEW_READSETS_BY_EXTERNAL_ID_QUERY = """
SELECT
    p.id AS submission_id,
    p.name AS submission_name,
    p.external_id AS external_id,
    pl.name AS platform_name,
    d.id AS dataset_id,
    d.lane AS dataset_lane,
    d.metric_report_url AS metric_report_url,
    rs.id AS readset_id,
    rs.name AS readset_name,
    rs.sample_name AS readset_sample_name,
    rs.validation_status AS readset_validation_status,
    rs.release_status AS readset_release_status,
    m.id AS metric_id,
    m.name AS metric_name,
    m.metric_group AS metric_group,
    m.value_numeric AS value_numeric,
    m.value_string AS value_string
FROM fms_core_project p
JOIN fms_core_dataset d
    ON d.project_id = p.id
JOIN fms_core_experimentrun er
    ON er.id = d.experiment_run_id
JOIN fms_core_runtype rt
    ON rt.id = er.run_type_id
JOIN fms_core_platform pl
    ON pl.id = rt.platform_id
JOIN fms_core_readset rs
    ON rs.dataset_id = d.id
JOIN fms_core_metric m
    ON m.readset_id = rs.id
WHERE p.external_id = %s
  AND p.deleted = FALSE
  AND d.deleted = FALSE
  AND er.deleted = FALSE
  AND rt.deleted = FALSE
  AND pl.deleted = FALSE
  AND rs.deleted = FALSE
  AND m.deleted = FALSE
ORDER BY
    d.id,
    d.lane,
    rs.id,
    m.metric_group,
    m.name,
    m.id;
"""