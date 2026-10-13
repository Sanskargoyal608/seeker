// frontend/app/(app)/_layout.js
// Protected app layout — only authenticated users reach here
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import WebSidebar from '../../components/WebSidebar';

export default function AppLayout() {
  const { isDesktop } = useResponsive();
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {isDesktop && <WebSidebar />}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: COLORS.background },
          }}
        />
      </View>
    </View>
  );
}
