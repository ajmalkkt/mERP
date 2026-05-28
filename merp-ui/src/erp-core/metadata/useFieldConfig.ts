import { useEffect, useState } from 'react';
import { useMetadataStore, type FieldMeta } from './metadataStore';

/**
 * Hook to fetch and cache field metadata for a given entity.
 * 
 * Usage:
 *   const { fields, loading } = useFieldConfig('Product');
 * 
 * Fields are cached in the Zustand store after the first fetch.
 */
export function useFieldConfig(entityName: string) {
  const loadEntityFields = useMetadataStore((state) => state.loadEntityFields);
  const cachedFields = useMetadataStore((state) => state.entityFields[entityName]);

  const [fields, setFields] = useState<FieldMeta[]>(cachedFields || []);
  const [loading, setLoading] = useState(!cachedFields);

  useEffect(() => {
    if (cachedFields) {
      setFields(cachedFields);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchFields = async () => {
      setLoading(true);
      const result = await loadEntityFields(entityName);
      if (!cancelled) {
        setFields(result);
        setLoading(false);
      }
    };

    fetchFields();

    return () => {
      cancelled = true;
    };
  }, [entityName, cachedFields, loadEntityFields]);

  return { fields, loading };
}
