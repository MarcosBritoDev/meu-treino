import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { ScreenHeader, Text } from '../ui';

export const ExerciseDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ExerciseDetail'>>();
  const exerciseId = route.params?.exerciseId;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Detalhes do exercício"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <Text variant="bodyLarge" color="secondary">
          {`Visualização do exercício ID: ${exerciseId} (Etapa 2.4).`}
        </Text>
      </View>
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
