import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { ScreenHeader, Card, Text, Button } from '../ui';
import { Download, Upload, ShieldCheck, Database } from 'lucide-react-native';

export const BackupScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Backup e dados"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="surface" style={styles.card}>
          <View style={styles.cardHeader}>
            <Database size={22} color={colors.primary} strokeWidth={1.75} />
            <Text variant="headline" style={styles.cardTitle}>
              Armazenamento local
            </Text>
          </View>
          <Text variant="bodyMedium" color="secondary">
            Como o Volt Precision funciona 100% offline e sem conta em nuvem, você pode exportar um arquivo com todos os seus treinos e restaurá-lo em qualquer outro aparelho.
          </Text>
        </Card>

        <Card variant="surface" style={styles.card}>
          <Text variant="headline" style={styles.cardTitle}>
            Exportar dados
          </Text>
          <Text variant="bodyMedium" color="secondary">
            Gera um arquivo com o histórico de treinos, exercícios personalizados e preferências.
          </Text>
          <Button
            title="Exportar backup"
            variant="secondary"
            icon={<Download size={18} color={colors.onSurface} strokeWidth={1.75} />}
            onPress={() => {}}
          />
        </Card>

        <Card variant="surface" style={styles.card}>
          <Text variant="headline" style={styles.cardTitle}>
            Restaurar dados
          </Text>
          <Text variant="bodyMedium" color="secondary">
            Restaure suas rotinas e histórico a partir de um arquivo de backup previamente exportado.
          </Text>
          <Button
            title="Importar backup"
            variant="secondary"
            icon={<Upload size={18} color={colors.onSurface} strokeWidth={1.75} />}
            onPress={() => {}}
          />
        </Card>

        <View style={styles.privacyNote}>
          <ShieldCheck size={18} color={colors.success} strokeWidth={1.75} />
          <Text variant="bodySmall" color="secondary" style={styles.privacyText}>
            Seus arquivos de backup são salvos apenas onde você escolher no seu aparelho.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.gutter,
  },
  card: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  privacyText: {
    flex: 1,
  },
});
