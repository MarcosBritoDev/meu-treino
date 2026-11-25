import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { ScreenHeader, Text, TextField, Button } from '../ui';

export const NewExerciseScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'NewExercise'>>();

  const [name, setName] = useState(route.params?.initialName ?? '');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Novo exercício"
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          <TextField
            label="Nome do exercício"
            placeholder="Ex: Kettlebell swing"
            value={name}
            onChangeText={setName}
            maxLength={60}
            showCounter
          />

          <View style={styles.infoBox}>
            <Text variant="bodySmall" color="secondary">
              O formulário completo de cadastro com seleção de grupo muscular, equipamento e tempo de descanso será implementado na Etapa 2.3.
            </Text>
          </View>
        </View>

        <Button
          title="Salvar exercício"
          variant="primary"
          onPress={() => navigation.goBack()}
          style={styles.saveButton}
        />
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
    padding: spacing.margin,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  formSection: {
    gap: spacing.md,
  },
  infoBox: {
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  saveButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
});
