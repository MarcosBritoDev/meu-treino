import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { ScreenHeader, Text } from '../ui';

export const GroupDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'GroupDetail'>>();
  const groupId = route.params?.groupId;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Detalhe do grupo"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodyLarge" color="secondary">
          {`Visualização do grupo ID: ${groupId} (Etapa 3.3).`}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.margin,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
