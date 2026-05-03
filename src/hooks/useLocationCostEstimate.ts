import * as Location from 'expo-location';
import { useState } from 'react';
import { estimateRepairCosts } from '../sdk/costEstimate';
import type { CostEstimate, DamageItem, LocationInfo } from '../sdk/types';

export type EstimateStatus = 'idle' | 'loading' | 'done' | 'permission_denied' | 'error';

export function useLocationCostEstimate() {
  const [status, setStatus] = useState<EstimateStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  async function getEstimate(damages: DamageItem[]): Promise<CostEstimate | null> {
    setStatus('loading');
    setError(null);

    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        setStatus('permission_denied');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [addr] = await Location.reverseGeocodeAsync(position.coords);

      const country = addr?.isoCountryCode ?? 'US';
      const region = addr?.region ?? undefined;
      const city = addr?.city ?? addr?.subregion ?? undefined;

      const locationInfo: LocationInfo = {
        country,
        region,
        label: [city, region, country].filter(Boolean).join(', '),
      };

      const estimate = estimateRepairCosts(damages, locationInfo);
      setStatus('done');
      return estimate;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not determine location.';
      setError(msg);
      setStatus('error');
      return null;
    }
  }

  return { status, error, getEstimate };
}
