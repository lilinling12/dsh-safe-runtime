const PACKAGE_ASSET_ROOT = "../assets/";
const PACKAGE_MANIFEST = "manifest.json";
const PACKAGE_FIXTURE_SCHEMA = "schemas/v1alpha1/tck-fixture.schema.json";

/**
 * Return a fresh URL for the root of the generated, packed Shared TCK assets.
 * The URL is resolved from the installed module itself, so consumers never need
 * repository-relative source paths or workspace layout knowledge.
 */
export function tckPackageAssetRootUrl(): URL {
  return new URL(PACKAGE_ASSET_ROOT, import.meta.url);
}

/** Return the installed package's generated TCK fixture manifest URL. */
export function tckPackageManifestUrl(): URL {
  return new URL(PACKAGE_MANIFEST, tckPackageAssetRootUrl());
}

/** Return the installed package's shared TCK fixture schema URL. */
export function tckPackageFixtureSchemaUrl(): URL {
  return new URL(PACKAGE_FIXTURE_SCHEMA, tckPackageAssetRootUrl());
}
