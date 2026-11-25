import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import {
  ScreenHeader,
  Card,
  Text,
  Button,
  EmptyState,
  PRBadge,
} from '../ui';
import { useSettingsStore } from '../store/useSettingsStore';
import { formatarPeso } from '../domain';
import { getExpoDb } from '../db';
import { Dumbbell, Database, Sparkles, Play } from 'lucide-react-native';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { testRecordCount, insertTestRecord, isReady, unit, defaultIncrement } = useSettingsStore();
  const [lastTestRecord, setLastTestRecord] = useState<string | null>(null);

  const fetchLastRecord = () => {
    try {
      const rawDb = getExpoDb();
      const rows = rawDb.getAllSync<{ name_snapshot: string; started_at: number }>(
        "SELECT name_snapshot, started_at FROM sessions WHERE name_snapshot LIKE 'Treino de teste%' ORDER BY started_at DESC LIMIT 1"
      );
      if (rows.length > 0) {
        setLastTestRecord(`${rows[0].name_snapshot} (${new Date(rows[0].started_at).toLocaleTimeString('pt-BR')})`);
      } else {
        setLastTestRecord('Nenhum registro ainda');
      }
    } catch {
      setLastTestRecord('Banco inicializando...');
    }
  };

  useEffect(() => {
    if (isReady) {
      fetchLastRecord();
    }
  }, [isReady, testRecordCount]);

  const handleInsertTest = async () => {
    await insertTestRecord();
    fetchLastRecord();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Início"
        onOpenSettings={() => navigation.navigate('Ajustes')}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Destaque / Treino Ativo */}
        <Card variant="highlight" style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text variant="labelSmall" color="coral">
              Pronto para treinar
            </Text>
            <PRBadge label="Volt Precision" />
          </View>
          <Text variant="headline" style={styles.heroTitle}>
            Registro de treinos 100% offline
          </Text>
          <Text variant="bodyMedium" color="secondary" style={styles.heroSubtitle}>
            Sem conta, sem rede, sem telemetria. Seus dados pertencem unicamente ao seu aparelho.
          </Text>
          <Button
            title="Iniciar treino livre"
            variant="large"
            icon={<Play size={20} color={colors.onPrimary} fill={colors.onPrimary} />}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Treinos' })}
          />
        </Card>

        {/* Verificação de Persistência SQLite Offline */}
        <Card variant="surface" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Database size={20} color={colors.primary} strokeWidth={1.75} />
            <Text variant="headline" style={styles.cardSectionTitle}>
              Persistência SQLite
            </Text>
          </View>

          <Text variant="bodyMedium" color="secondary" style={styles.infoText}>
            Gravação e leitura de registros locais para validação do banco SQLite + Drizzle:
          </Text>

          <View style={styles.statusBox}>
            <Text variant="bodySmall" color="muted">
              Unidade ativa e incremento:
            </Text>
            <Text variant="headline" color="coral" tabular>
              {`${unit.toUpperCase()} • +${formatarPeso(defaultIncrement, unit)}`}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text variant="bodySmall" color="muted">
              Registros de teste no banco:
            </Text>
            <Text variant="headline" color="coral" tabular>
              {testRecordCount}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text variant="bodySmall" color="muted">
              Último registro lido:
            </Text>
            <Text variant="bodyMedium" color="primary">
              {lastTestRecord || 'Carregando...'}
            </Text>
          </View>

          <Button
            title="Gravar registro de teste"
            variant="secondary"
            onPress={handleInsertTest}
            style={styles.testButton}
          />
        </Card>

        {/* Acesso rápido à Galeria Interna de Componentes (Dev) */}
        <Card variant="high" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Sparkles size={20} color={colors.pr} strokeWidth={1.75} />
            <Text variant="headline" style={styles.cardSectionTitle}>
              Galeria de componentes
            </Text>
          </View>
          <Text variant="bodyMedium" color="secondary" style={styles.infoText}>
            Ambiente interno de inspeção visual de todos os tokens e componentes base nos estados default, pressed e disabled.
          </Text>
          <Button
            title="Abrir galeria de componentes"
            variant="secondary"
            onPress={() => navigation.navigate('DevGallery')}
            style={styles.testButton}
          />
        </Card>
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
    paddingBottom: spacing.tabBarHeight + spacing.xl,
    gap: spacing.gutter,
  },
  heroCard: {
    gap: spacing.sm,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    marginBottom: spacing.md,
  },
  sectionCard: {
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardSectionTitle: {
    fontSize: 18,
  },
  infoText: {
    marginBottom: spacing.xs,
  },
  statusBox: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 16,
    padding: spacing.md,
    gap: 4,
  },
  testButton: {
    marginTop: spacing.xs,
  },
});
