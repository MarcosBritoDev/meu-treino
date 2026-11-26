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
  ArrowLeft,
  Dumbbell,
  Clock,
  Layers,
  Calendar,
  CheckCircle,
  Activity,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { getExpoDb } from '../db/client';
import { calcularVolume, formatDecimalBR, isSetInVolume } from '../domain/sessionMath';

type RouteParams = RouteProp<RootStackParamList, 'SessionDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SessionDetailData {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number | null;
  workoutId: string | null;
  totalVolume: number;
  totalSets: number;
  durationMin: number;
}

interface SessionExerciseDetail {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  targetSets: number;
  repMin: number;
  repMax: number;
}

export const SessionDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const sessionId = route.params?.sessionId;

  const [session, setSession] = useState<SessionDetailData | null>(null);
  const [exercises, setExercises] = useState<SessionExerciseDetail[]>([]);
  const [averageRpe, setAverageRpe] = useState<number | null>(null);
  const [unit, setUnit] = useState('kg');

  useEffect(() => {
    if (!sessionId) return;
    try {
      const rawDb = getExpoDb();

      // Unidade de medida
      const sRows = rawDb.getAllSync<{ unit: string }>('SELECT unit FROM settings WHERE id = 1 LIMIT 1');
      if (sRows.length > 0) setUnit(sRows[0].unit || 'kg');

      // Detalhes da sessão
      const sessRows = rawDb.getAllSync<{
        id: string;
        name_snapshot: string;
        started_at: number;
        ended_at: number | null;
        workout_id: string | null;
      }>(
        `SELECT id, name_snapshot, started_at, ended_at, workout_id
         FROM sessions
         WHERE id = ?`,
        [sessionId]
      );

      if (sessRows.length > 0) {
        const s = sessRows[0];
        const durationMs = Math.max(60000, (s.ended_at || Date.now()) - s.started_at);
        const durationMin = Math.max(1, Math.round(durationMs / 60000));

        // Volume total calculado com a regra oficial (exclui aquecimento, 2x para Halteres)
        const exVolRows = rawDb.getAllSync<{
          id: string;
          equipment: string;
        }>(
          `SELECT se.id, e.equipment
           FROM session_exercises se
           JOIN exercises e ON se.exercise_id = e.id
           WHERE se.session_id = ?`,
          [sessionId]
        );

        let totalVolume = 0;
        let setsCount = 0;

        for (const ex of exVolRows) {
          const sRows = rawDb.getAllSync<{
            weight: number;
            reps: number;
            is_warmup: number;
            type?: string;
            completed_at: number | null;
          }>(
            `SELECT weight, reps, is_warmup, type, completed_at FROM sets WHERE session_exercise_id = ?`,
            [ex.id]
          );

          totalVolume += calcularVolume(
            sRows.map((r) => ({
              weight: r.weight,
              reps: r.reps,
              isWarmup: Boolean(r.is_warmup),
              type: r.type,
              completedAt: r.completed_at,
            })),
            ex.equipment
          );

          const completedNonWarmup = sRows.filter(
            (r) =>
              r.completed_at !== null &&
              isSetInVolume({ type: r.type, isWarmup: Boolean(r.is_warmup) })
          );
          setsCount += completedNonWarmup.length;
        }

        if (setsCount === 0) {
          const targetRows = rawDb.getAllSync<{ totalTargetSets: number }>(
            `SELECT COALESCE(SUM(target_sets), 0) AS totalTargetSets
             FROM session_exercises
             WHERE session_id = ?`,
            [sessionId]
          );
          setsCount = targetRows[0]?.totalTargetSets ?? 0;
        }

        // Esforço médio (RPE do histórico antigo, se houver)
        const rpeRows = rawDb.getAllSync<{ avgRpe: number | null }>(
          `SELECT AVG(st.rpe) AS avgRpe
           FROM session_exercises se
           JOIN sets st ON st.session_exercise_id = se.id
           WHERE se.session_id = ? AND st.rpe IS NOT NULL AND st.rpe > 0`,
          [sessionId]
        );
        const avgRpe =
          rpeRows.length > 0 && rpeRows[0].avgRpe !== null
            ? Number(rpeRows[0].avgRpe.toFixed(1))
            : null;
        setAverageRpe(avgRpe);

        setSession({
          id: s.id,
          name: s.name_snapshot,
          startedAt: s.started_at,
          endedAt: s.ended_at,
          workoutId: s.workout_id,
          totalVolume,
          totalSets: setsCount,
          durationMin,
        });

        // Exercícios
        const exRows = rawDb.getAllSync<SessionExerciseDetail>(
          `SELECT 
            se.id,
            e.name AS exerciseName,
            e.muscle_group AS muscleGroup,
            e.equipment,
            se.target_sets AS targetSets,
            se.rep_min AS repMin,
            se.rep_max AS repMax
           FROM session_exercises se
           JOIN exercises e ON e.id = se.exercise_id
           WHERE se.session_id = ?
           ORDER BY se.position ASC`,
          [sessionId]
        );
        setExercises(exRows);
      }
    } catch (err) {
      console.warn('Erro ao carregar detalhes da sessão:', err);
    }
  }, [sessionId]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text variant="headline" style={styles.headerTitle}>
          Detalhes da sessão
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.statusBadge}>
            <CheckCircle size={14} color="#34D399" strokeWidth={2.5} />
            <Text variant="labelSmall" style={styles.statusText}>
              Sessão concluída
            </Text>
          </View>
          <Text variant="headline" style={styles.sessionName}>
            {session?.name || 'Sessão de treino'}
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.dateSubtitle}>
            {formatDate(session?.endedAt || session?.startedAt)} · Duração {session?.durationMin ?? 0} min
          </Text>
        </View>

        {/* MÉTRICAS (3 COLUNAS) */}
        <View style={styles.metricsRow}>
          <Card variant="surface" style={styles.metricCard}>
            <Text variant="labelSmall" color="secondary" style={styles.metricLabel}>
              Carga total
            </Text>
            <View style={styles.metricValueRow}>
              <Text variant="headline" color="coral" style={styles.metricLargeNumber}>
                {Math.round(session?.totalVolume ?? 0).toLocaleString('pt-BR')}
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.metricUnit}>
                {unit}
              </Text>
            </View>
          </Card>

          <Card variant="surface" style={styles.metricCard}>
            <Text variant="labelSmall" color="secondary" style={styles.metricLabel}>
              Séries totais
            </Text>
            <View style={styles.metricValueRow}>
              <Text variant="headline" style={styles.metricLargeNumber}>
                {session?.totalSets ?? 0}
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.metricUnit}>
                séries
              </Text>
            </View>
          </Card>

          <Card variant="surface" style={styles.metricCard}>
            <Text variant="labelSmall" color="secondary" style={styles.metricLabel}>
              Exercícios
            </Text>
            <View style={styles.metricValueRow}>
              <Text variant="headline" style={styles.metricLargeNumber}>
                {exercises.length}
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.metricUnit}>
                blocos
              </Text>
            </View>
          </Card>
        </View>

        {/* Card: Esforço Médio (Oculto quando não houver RPE gravado em histórico antigo) */}
        {averageRpe !== null && (
          <Card variant="surface" style={styles.effortCard}>
            <View style={styles.effortCardHeader}>
              <View style={styles.effortTitleRow}>
                <Activity size={18} color={colors.primary} strokeWidth={2} />
                <Text variant="bodyMedium" style={styles.effortTitle}>
                  Esforço médio
                </Text>
              </View>
              <Text variant="labelSmall" color="secondary">
                Histórico
              </Text>
            </View>
            <View style={styles.effortValueRow}>
              <Text variant="headline" style={styles.effortValue}>
                RPE {formatDecimalBR(averageRpe)}
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.effortScale}>
                / 10
              </Text>
            </View>
          </Card>
        )}

        {/* LISTA DE EXERCÍCIOS DA SESSÃO */}
        <View style={styles.exerciseSection}>
          <Text variant="labelSmall" style={styles.sectionTitle}>
            Exercícios realizados ({exercises.length})
          </Text>

          {exercises.map((ex, idx) => (
            <Card key={ex.id} variant="surface" style={styles.exerciseCard}>
              <View style={styles.exerciseCardLeft}>
                <Text variant="displayMedium" style={styles.exerciseIndex}>
                  {String(idx + 1).padStart(2, '0')}
                </Text>
                <View style={styles.exerciseInfo}>
                  <Text variant="bodyMedium" style={styles.exerciseNameText}>
                    {ex.exerciseName}
                  </Text>
                  <Text variant="bodySmall" color="secondary" style={styles.exerciseMetaText}>
                    {ex.targetSets} séries · {ex.repMin}-{ex.repMax} reps
                  </Text>
                  <Text variant="labelSmall" style={styles.muscleText}>
                    {ex.muscleGroup} • {ex.equipment}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backButton: {
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
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroSection: {
    gap: 4,
    paddingTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginBottom: 4,
  },
  statusText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  dateSubtitle: {
    fontSize: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: radii.card,
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricLargeNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 11,
  },
  exerciseSection: {
    gap: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  exerciseCard: {
    padding: 14,
    borderRadius: radii.card,
  },
  exerciseCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  exerciseIndex: {
    fontSize: 20,
    fontFamily: fontFamilies.outfitBold,
    color: colors.primary,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  exerciseMetaText: {
    fontSize: 13,
  },
  muscleText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  effortCard: {
    padding: 14,
    borderRadius: radii.card,
    gap: 8,
  },
  effortCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  effortTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  effortTitle: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  effortValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  effortValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
  },
  effortScale: {
    fontSize: 13,
  },
});
