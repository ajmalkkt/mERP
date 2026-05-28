import { useMetadataStore } from './metadataStore';

/**
 * Hook to get a tag-mapped label for any system entity name.
 * 
 * Usage:
 *   const label = useTag('warehouse');  // → "Stock Point" (if mapped)
 *   const label = useTag('department'); // → "Division" (if mapped)
 * 
 * Falls back to the system name if no mapping exists.
 */
export function useTag(systemName: string): string {
  const tags = useMetadataStore((state) => state.tags);
  return tags[systemName] || systemName;
}

/**
 * Hook to get multiple tag-mapped labels at once.
 * 
 * Usage:
 *   const labels = useTags(['warehouse', 'department', 'item']);
 *   // → { warehouse: "Stock Point", department: "Division", item: "Product" }
 */
export function useTags(systemNames: string[]): Record<string, string> {
  const tags = useMetadataStore((state) => state.tags);
  const result: Record<string, string> = {};
  systemNames.forEach((name) => {
    result[name] = tags[name] || name;
  });
  return result;
}
