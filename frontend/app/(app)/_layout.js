// frontend/app/(app)/_layout.js
// Protected app layout — only authenticated users reach here
import { Stack } from 'expo-router';
import { COLORS } from '../../constants/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
  );
}
