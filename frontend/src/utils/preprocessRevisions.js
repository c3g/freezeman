import {parse} from "querystring";

export function preprocessUserActionRevisions(previousRevisions, /* mut */ revisions) {
  let options = null
  if (revisions.next)
    options = parse(revisions.next.replace(/^.*\?/, ''))

  return {
    isFetching: false,
    count: revisions.count,
    next: options,
    results: (previousRevisions?.results ?? []).concat(revisions.results),
  }
}

export function preprocessUserActionVersions(previousVersions, /* mut */ versions) {
  versions.results.forEach(version => {
    version.key = version.id;
    version.fields = JSON.parse(version.serialized_data)[0].fields;
  });

  let options = null
  if (versions.next) {
    options = parse(versions.next.replace(/^.*\?/, ''))
    delete options.revision__user
  }

  return {
    isFetching: false,
    count: versions.count,
    next: options,
    results: (previousVersions?.results ?? []).concat(versions.results),
  }
}

export function preprocessSampleVersions(/* mut */ versions) {
  versions.forEach(version => {
    version.key = version.id;
    version.fields = JSON.parse(version.serialized_data)[0].fields;
  });
  return versions;
}