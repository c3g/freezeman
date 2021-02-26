export default function preprocessVersions(/* mut */ versions) {
  versions.forEach(version => {
    version.key = version.id;
    version.fields = JSON.parse(version.serialized_data)[0].fields;
  });
  return versions;
}
