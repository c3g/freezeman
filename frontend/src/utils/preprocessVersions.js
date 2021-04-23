import {parse} from "querystring";

export default function preprocessVersions(previousVersions, /* mut */ versions) {
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
