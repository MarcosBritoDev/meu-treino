import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { ScreenHeader, Text } from '../ui';

export const NewExerciseScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Novo exercício"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <Text variant="bodyLarge" color="secondary">
          Fluxo de cadastro de exercício (Etapa 2.3).
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
