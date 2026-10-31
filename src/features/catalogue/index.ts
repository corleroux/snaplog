/**
 * Catalogue feature — schema-driven capture and review (FR-SCH-05, FR-EXT-06).
 *
 * Catalogue types render from the `catalogue_types` registry rows, so adding
 * a category needs no application code changes.
 */

export * from './api/catalogueRegistry'
export { extractCatalogueItem } from './api/extractCatalogueItem'
export { commitCatalogueItem } from './api/commitCatalogueItem'
export { CatalogueTypePicker } from './components/CatalogueTypePicker'
export { SchemaReviewForm } from './components/SchemaReviewForm'
export { CatalogueItemReviewScreen } from './screens/CatalogueItemReviewScreen'
export { CatalogueItemCaptureFlow } from './screens/CatalogueItemCaptureFlow'
export { VideoCaptureScreen } from './screens/VideoCaptureScreen'
export { useCatalogueItemCaptureFlow } from './hooks/useCatalogueItemCaptureFlow'
