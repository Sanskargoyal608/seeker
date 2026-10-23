// frontend/app/(app)/_layout.js
// Protected app layout. Signed-out visitors are sent to login, and each screen is
// only reachable by the roles it was built for.
import { Redirect, Stack, useSegments } from 'expo-router';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import WebSidebar from '../../components/WebSidebar';
import { selectIsAuthenticated, selectUser } from '../../store/authSlice';
import { SCREEN_ROLES } from '../../constants/screenRoles';

export default function AppLayout() {
  const { isDesktop } = useResponsive();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const segments = useSegments();

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  const screen = segments[1]; // ['(app)', '<screen>', ...]
  const allowed = screen ? SCREEN_ROLES[screen] : null;
  if (allowed && !allowed.includes(user.role)) {
    return <Redirect href="/(app)/dashboard" />;
  }

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
