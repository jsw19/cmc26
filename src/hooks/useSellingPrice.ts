import * as Location from 'expo-location';
import { useState } from 'react';
import { estimateSellingPrice } from '../sdk/sellingPrice';
import type { LocationInfo, SellingPriceEstimate, Severity, VehicleInfo } from '../sdk/types';

export type SellingPriceStatus = 'idle' | 'loading' | 'done' | 'permission_denied' | 'error';

export function useSellingPrice() {
  const [status, setStatus] = useState<SellingPriceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SellingPriceEstimate | null>(null);

  async function getEstimate(
    vehicleInfo: VehicleInfo,
    overallSeverity: Severity,
    existingLocation?: LocationInfo
  ): Promise<SellingPriceEstimate | null> {
    setStatus('loading');
    setError(null);

    try {
      let locationInfo: LocationInfo;

      if (existingLocation) {
        locationInfo = existingLocation;
      } else {
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

        locationInfo = {
          country,
          region,
          label: [city, region, country].filter(Boolean).join(', '),
        };
      }

      const estimate = estimateSellingPrice(vehicleInfo, overallSeverity, locationInfo);
      setResult(estimate);
      setStatus('done');
      return estimate;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not determine location.';
      setError(msg);
      setStatus('error');
      return null;
    }
  }

  return { status, error, result, getEstimate };
}
