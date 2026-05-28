import { useEffect, useState } from 'react';
import { useMetadataStore, type VoucherConfig } from './metadataStore';

/**
 * Hook to fetch and cache voucher type configuration.
 * 
 * Usage:
 *   const { config, loading } = useVoucherConfig('SALES_INVOICE');
 */
export function useVoucherConfig(voucherType: string) {
  const loadVoucherConfig = useMetadataStore((state) => state.loadVoucherConfig);
  const cachedConfig = useMetadataStore((state) => state.voucherConfigs[voucherType]);

  const [config, setConfig] = useState<VoucherConfig | null>(cachedConfig || null);
  const [loading, setLoading] = useState(!cachedConfig);

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchConfig = async () => {
      setLoading(true);
      const result = await loadVoucherConfig(voucherType);
      if (!cancelled) {
        setConfig(result);
        setLoading(false);
      }
    };

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, [voucherType, cachedConfig, loadVoucherConfig]);

  return { config, loading };
}
