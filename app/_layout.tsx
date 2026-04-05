import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { InspectionProvider } from '../src/context/InspectionContext';

export default function RootLayout() {
  return (
    <InspectionProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f0f0f' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#0f0f0f' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="camera"
          options={{
            title: 'New Inspection',
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="analysis"
          options={{ title: 'Analysis Results' }}
        />
      </Stack>
    </InspectionProvider>
  );
}
