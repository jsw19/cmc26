import { StyleSheet, View } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

/**
 * A deliberately low-impact ad placement for the inspection history view.
 * Keep TestIds.BANNER until the AdMob account, consent flow, and release build
 * are ready. Never click live ads on a development device.
 */
export function HistoryBannerAd() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={TestIds.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minHeight: 50,
    backgroundColor: '#0f0f0f',
  },
});
