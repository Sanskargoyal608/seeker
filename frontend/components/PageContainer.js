import React from 'react';
import { View } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

export function PageContainer({ children, style }) {
  const { contentMaxWidth } = useResponsive();
  return (
    <View style={[{ flex: 1, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }, style]}>
      {children}
    </View>
  );
}
