import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  X,
  Check,
  Zap,
  Dumbbell,
  Timer,
  Layers,
  Activity,
  Trophy,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PRBadge } from '../ui/PRBadge';
import { triggerHaptic } from '../ui/haptics';
import { getExpoDb } from '../db/client';

type RouteParams = RouteProp<RootStackParamList, 'WorkoutSummary'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PRRecordItem {
  id: string;
  exerciseName: string;
  weight: number;
  reps: number;
  isPrWeight: boolean;
  isPrVolume: boolean;
}

export const WorkoutSummaryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const sessionId = route.params?.sessionId;

  const [sessionName, setSessionName] = useState('Treino');
  const [durationMin, setDurationMin] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalSets, setTotalSets] = useState(0);
  const [averageRpe, setAverageRpe] = useState<number | null>(null);
  const [unit, setUnit] = useState('kg');
  const [records, setRecords] = useState<PRRecordItem[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      const rawDb = getExpoDb();

      // Unidade de medida
      const sRows = rawDb.getAllSync<{ unit: string }>('SELECT unit FROM settings WHERE id = 1 LIMIT 1');
      if (sRows.length > 0) setUnit(sRows[0].unit || 'kg');

      // Informações da sessão
      const sessRows = rawDb.getAllSync<{
        name_snapshot: string;
        started_at: number;
        ended_at: number | null;
      }>(
        `SELECT name_snapshot, started_at, ended_at FROM sessions WHERE id = ?`,
        [sessionId]
      );

      if (sessRows.length > 0) {
        const s = sessRows[0];
        setSessionName(s.name_snapshot);
        const durMs = Math.max(60000, (s.ended_at || Date.now()) - s.started_at);
        setDurationMin(Math.max(1, Math.round(durMs / 60000)));
      }

      // Métricas de séries e volume
      const metricsRows = rawDb.getAllSync<{
        setsCount: number;
        totalVol: number;
        avgRpe: number | null;
      }>(
        `SELECT 
          COUNT(st.id) AS setsCount,
          COALESCE(SUM(st.weight * st.reps), 0) AS totalVol,
          AVG(st.rpe) AS avgRpe
         FROM session_exercises se
         JOIN sets st ON st.session_exercise_id = se.id
         WHERE se.session_id = ? AND st.completed_at IS NOT NULL`,
        [sessionId]
      );

      if (metricsRows.length > 0) {
        setTotalSets(metricsRows[0].setsCount);
        setTotalVolume(metricsRows[0].totalVol);
        setAverageRpe(metricsRows[0].avgRpe ? Number(metricsRows[0].avgRpe.toFixed(1)) : null);
      }

      // Recordes (PRs) obtidos nesta sessão
      const prRows = rawDb.getAllSync<{
        id: string;
        exerciseName: string;
        weight: number;
        reps: number;
        isPrWeight: number;
        isPrVolume: number;
      }>(
        `SELECT 
          st.id,
          e.name AS exerciseName,
          st.weight,
          st.reps,
          st.is_pr_weight AS isPrWeight,
          st.is_pr_volume AS isPrVolume
         FROM session_exercises se
         JOIN sets st ON st.session_exercise_id = se.id
         JOIN exercises e ON se.exercise_id = e.id
         WHERE se.session_id = ? AND (st.is_pr_weight = 1 OR st.is_pr_volume = 1)
         ORDER BY st.completed_at ASC`,
        [sessionId]
      );

      setRecords(
        prRows.map((r) => ({
          id: r.id,
          exerciseName: r.exerciseName,
          weight: r.weight,
          reps: r.reps,
          isPrWeight: Boolean(r.isPrWeight),
          isPrVolume: Boolean(r.isPrVolume),
        }))
      );
    } catch (err) {
      console.warn('Erro ao carregar resumo do treino:', err);
    }
  }, [sessionId]);

  const handleFinish = () => {
    triggerHaptic('medium');
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <Pressable
          onPress={handleFinish}
          style={styles.closeButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Fechar resumo"
        >
          <X size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text variant="headline" style={styles.headerTitle}>
          Resumo do treino
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SELO CELEBRATIVO */}
        <View style={styles.celebrationSection}>
          <View style={styles.badgeOuter}>
            <View style={styles.badgeInner}>
              <Check size={36} color={colors.onPrimary} strokeWidth={3} />
            </View>
            <View style={styles.badgeSparkle}>
              <Zap size={14} color="#F6BC64" fill="#F6BC64" />
            </View>
          </View>

          <Text variant="headline" style={styles.congratsTitle}>
            Treino concluído!
          </Text>
          <Text variant="bodyMedium" style={styles.congratsSubtitle}>
            {sessionName} finalizado em {durationMin} {durationMin === 1 ? 'minuto' : 'minutos'}
          </Text>
        </View>

        {/* GRADE 2x2 DE MÉTRICAS */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Volume Total */}
          <Card variant="surface" style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text variant="labelSmall" color="secondary">
                Volume total
              </Text>
              <Dumbbell size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            </View>
            <Text variant="headline" style={styles.metricValue}>
              {Math.round(totalVolume).toLocaleString('pt-BR')}{' '}
              <Text variant="bodySmall" color="secondary">
                {unit}
              </Text>
            </Text>
          </Card>

          {/* Card 2: Séries */}
          <Card variant="surface" style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text variant="labelSmall" color="secondary">
                Séries totais
              </Text>
              <Layers size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            </View>
            <Text variant="headline" style={styles.metricValue}>
              {totalSets}
            </Text>
          </Card>

          {/* Card 3: Tempo */}
          <Card variant="surface" style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text variant="labelSmall" color="secondary">
                Duração total
              </Text>
              <Timer size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            </View>
            <Text variant="headline" style={styles.metricValue}>
              {durationMin}{' '}
              <Text variant="bodySmall" color="secondary">
                min
              </Text>
            </Text>
          </Card>

          {/* Card 4: Intensidade RPE */}
          <Card variant="surface" style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text variant="labelSmall" color="secondary">
                Intensidade média
              </Text>
              <Activity size={18} color="#F6BC64" strokeWidth={2} />
            </View>
            <Text variant="headline" style={styles.metricValue}>
              {averageRpe ? `RPE ${averageRpe}` : '—'}
            </Text>
          </Card>
        </View>

        {/* SEÇÃO RECORDES DA SESSÃO */}
        {records.length > 0 && (
          <View style={styles.recordsSection}>
            <View style={styles.recordsHeader}>
              <Text variant="headline" style={styles.recordsTitle}>
                Recordes da sessão
              </Text>
              <View style={styles.recordsBadge}>
                <Trophy size={14} color="#F6BC64" strokeWidth={2.2} />
                <Text variant="labelSmall" style={styles.recordsBadgeText}>
                  {records.length} {records.length === 1 ? 'novo PR' : 'novos PRs'}
                </Text>
              </View>
            </View>

            <View style={styles.recordsList}>
              {records.map((rec) => (
                <Card key={rec.id} variant="surface" style={styles.recordCard}>
                  <View style={styles.recordLeft}>
                    <Text variant="bodyLarge" style={styles.recordExerciseName}>
                      {rec.exerciseName}
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {rec.weight} {unit} × {rec.reps} reps
                    </Text>
                  </View>
                  <PRBadge label="Novo PR" />
                </Card>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTÃO FIXO INFERIOR */}
      <View style={styles.footer}>
        <Button
          title="Voltar ao início"
          variant="primary"
          onPress={handleFinish}
          style={styles.finishButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 22,
  },
  celebrationSection: {
    alignItems: 'center',
    paddingTop: 12,
    gap: 8,
  },
  badgeOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 122, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  badgeInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSparkle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  congratsTitle: {
    fontSize: 26,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  congratsSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    padding: 16,
    borderRadius: radii.card,
    gap: 12,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 22,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
  },
  recordsSection: {
    gap: 12,
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordsTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
  },
  recordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 196, 107, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 107, 0.3)',
  },
  recordsBadgeText: {
    color: colors.pr,
    fontSize: 12,
    fontWeight: '700',
  },
  recordsList: {
    gap: 8,
  },
  recordCard: {
    padding: 14,
    borderRadius: radii.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordLeft: {
    gap: 2,
  },
  recordExerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  finishButton: {
    height: 52,
    borderRadius: radii.pill,
  },
});
