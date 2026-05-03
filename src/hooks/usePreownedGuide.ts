import * as Location from 'expo-location';
import { useState } from 'react';
import { findPreownedCars } from '../sdk/preownedGuide';
import type { LocationInfo, PreownedGuideResult, VehicleCategory } from '../sdk/types';

export type PreownedGuideStatus = 'idle' | 'loading' | 'done' | 'permission_denied' | 'error';

export function usePreownedGuide() {
  const [status, setStatus] = useState<PreownedGuideStatus>('idle');
  const [result, setResult] = useState<PreownedGuideResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);

  async function getRecommendations(
    budgetLocal: number,
    categoryFilter?: VehicleCategory
  ): Promise<void> {
    setStatus('loading');
    setError(null);

    try {
      let location = locationInfo;

      if (!location) {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus !== 'granted') {
          setStatus('permission_denied');
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const [addr] = await Location.reverseGeocodeAsync(position.coords);

        const country = addr?.isoCountryCode ?? 'US';
        const region = addr?.region ?? undefined;
        const city = addr?.city ?? addr?.subregion ?? undefined;

        location = {
          country,
          region,
          label: [city, region, country].filter(Boolean).join(', '),
        };
        setLocationInfo(location);
      }

      const guideResult = findPreownedCars(budgetLocal, location, categoryFilter);
      setResult(guideResult);
      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not determine location.';
      setError(msg);
      setStatus('error');
    }
  }

  return { status, result, error, locationInfo, getRecommendations };
}
