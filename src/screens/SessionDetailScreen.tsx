import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Dumbbell,
  Clock,
  Layers,
  CheckCircle,
  Activity,
  Trophy,
  AlertCircle,
  RotateCcw,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, fontFamilies, spacing } from '../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { triggerHaptic } from '../ui/haptics';
import { getExpoDb } from '../db/client';
import {
  calcularVolume,
  formatDecimalBR,
  formatWeight,
  isSetInVolume,
  getSetDisplayLabel,
  Unit,
} from '../domain/sessionMath';

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

interface CompletedSetDetail {
  id: string;
  sessionExerciseId: string;
  index: number;
  weight: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
  type: string;
  isPrWeight: boolean;
  isPrVolume: boolean;
  completedAt: number | null;
}

interface SessionExerciseDetail {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  targetSets: number;
  repMin: number;
  repMax: number;
  hasPr: boolean;
  sets: CompletedSetDetail[];
}

/**
 * Formata minutos em padrão fitness compacto (ex: "45 min", "1h", "1h 15min").
 */
const formatDuration = (min: number): string => {
  if (min < 60) {
    return `${min} min`;
  }
  const hours = Math.floor(min / 60);
  const remainingMin = min % 60;
  if (remainingMin === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMin}min`;
};

export const SessionDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const sessionId = route.params?.sessionId;

  const [session, setSession] = useState<SessionDetailData | null>(null);
  const [exercises, setExercises] = useState<SessionExerciseDetail[]>([]);
  const [averageRpe, setAverageRpe] = useState<number | null>(null);
  const [unit, setUnit] = useState<Unit>('kg');
  const [hasError, setHasError] = useState(false);

  const loadSessionData = useCallback(() => {
    if (!sessionId) return;
    setHasError(false);
    try {
      const rawDb = getExpoDb();

      // 1. Unidade de medida preferida do usuário (kg ou lb)
      const sRows = rawDb.getAllSync<{ unit: string }>(
        'SELECT unit FROM settings WHERE id = 1 LIMIT 1'
      );
      const currentUnit = (sRows.length > 0 && sRows[0].unit ? sRows[0].unit : 'kg') as Unit;
      setUnit(currentUnit);

      // 2. Metadados da sessão
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

      if (sessRows.length === 0) {
        setHasError(true);
        return;
      }

      const s = sessRows[0];
      const durationMs = Math.max(60000, (s.ended_at || Date.now()) - s.started_at);
      const durationMin = Math.max(1, Math.round(durationMs / 60000));

      // 3. Exercícios da sessão (ordenados pela posição)
      const exRows = rawDb.getAllSync<{
        id: string;
        exerciseName: string;
        muscleGroup: string;
        equipment: string;
        targetSets: number;
        repMin: number;
        repMax: number;
      }>(
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

      // 4. Séries registradas dos exercícios da sessão
      const allSetRows = rawDb.getAllSync<{
        id: string;
        session_exercise_id: string;
        index: number;
        weight: number;
        reps: number;
        rpe: number | null;
        is_warmup: number;
        type: string;
        is_pr_weight: number;
        is_pr_volume: number;
        completed_at: number | null;
      }>(
        `SELECT 
          st.id,
          st.session_exercise_id,
          st."index",
          st.weight,
          st.reps,
          st.rpe,
          st.is_warmup,
          st.type,
          st.is_pr_weight,
          st.is_pr_volume,
          st.completed_at
         FROM session_exercises se
         JOIN sets st ON st.session_exercise_id = se.id
         WHERE se.session_id = ?
         ORDER BY se.position ASC, st."index" ASC`,
        [sessionId]
      );

      // Agrupar séries por session_exercise_id
      const setsByExId = new Map<string, CompletedSetDetail[]>();
      for (const r of allSetRows) {
        const list = setsByExId.get(r.session_exercise_id) || [];
        list.push({
          id: r.id,
          sessionExerciseId: r.session_exercise_id,
          index: r.index,
          weight: r.weight,
          reps: r.reps,
          rpe: r.rpe !== null && r.rpe > 0 ? r.rpe : null,
          isWarmup: Boolean(r.is_warmup),
          type: r.type || (Boolean(r.is_warmup) ? 'warmup' : 'normal'),
          isPrWeight: Boolean(r.is_pr_weight),
          isPrVolume: Boolean(r.is_pr_volume),
          completedAt: r.completed_at,
        });
        setsByExId.set(r.session_exercise_id, list);
      }

      // 5. Volume total com exclusão de aquecimento e dobro para Halteres (regra oficial de domínio)
      let totalVolume = 0;
      let completedSetsCount = 0;

      const fullExercises: SessionExerciseDetail[] = exRows.map((ex) => {
        const exSets = setsByExId.get(ex.id) || [];
        totalVolume += calcularVolume(
          exSets.map((st) => ({
            weight: st.weight,
            reps: st.reps,
            isWarmup: st.isWarmup,
            type: st.type,
            completedAt: st.completedAt,
          })),
          ex.equipment
        );

        const nonWarmupCompleted = exSets.filter(
          (st) =>
            st.completedAt !== null &&
            isSetInVolume({ type: st.type, isWarmup: st.isWarmup })
        );
        completedSetsCount += nonWarmupCompleted.length;

        // PR válido apenas fora de aquecimento e drop
        const hasPr = exSets.some(
          (st) =>
            (st.isPrWeight || st.isPrVolume) &&
            st.type !== 'warmup' &&
            st.type !== 'drop'
        );

        return {
          ...ex,
          hasPr,
          sets: exSets,
        };
      });

      if (completedSetsCount === 0) {
        completedSetsCount = fullExercises.reduce((sum, ex) => sum + ex.targetSets, 0);
      }

      // 6. Esforço médio (RPE de histórico legado, se houver registros válidos)
      const validRpes = allSetRows
        .filter((r) => r.rpe !== null && r.rpe > 0)
        .map((r) => r.rpe as number);
      const avgRpe =
        validRpes.length > 0
          ? Number((validRpes.reduce((a, b) => a + b, 0) / validRpes.length).toFixed(1))
          : null;
      setAverageRpe(avgRpe);

      setSession({
        id: s.id,
        name: s.name_snapshot,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        workoutId: s.workout_id,
        totalVolume,
        totalSets: completedSetsCount,
        durationMin,
      });

      setExercises(fullExercises);
    } catch (err) {
      console.warn('Erro ao carregar detalhes da sessão:', err);
      setHasError(true);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

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
      {/* CABEÇALHO ERGONÔMICO (TOUCH TARGET >= 48DP) */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            navigation.goBack();
          }}
          style={styles.backButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>

        <Text variant="headline" style={styles.headerTitle}>
          Detalhes da sessão
        </Text>

        <View style={styles.headerSpacer} pointerEvents="none" />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(36, insets.bottom + 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ESTADO DE ERRO AMIGÁVEL COM BOTÃO RECARREGAR */}
        {hasError ? (
          <Card variant="surface" style={styles.errorCard}>
            <AlertCircle size={38} color={colors.error} strokeWidth={2} />
            <View style={styles.errorInfo}>
              <Text variant="headline" style={styles.errorTitle}>
                Não foi possível carregar os dados
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.errorSubtitle}>
                Ocorreu uma falha ao ler os registros desta sessão no banco de dados local.
              </Text>
            </View>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                loadSessionData();
              }}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Tentar novamente"
            >
              <RotateCcw size={16} color={colors.onSurface} strokeWidth={2} />
              <Text variant="bodyMedium" style={styles.retryButtonText}>
                Tentar novamente
              </Text>
            </Pressable>
          </Card>
        ) : (
          <>
            {/* HERO SECTION COMPACTA: SEM BLOCO VAZIO DE RPE */}
            <View style={styles.heroSection}>
              <View style={styles.badgeRow}>
                {/* Badge Concluído com Soft Mint Green do DESIGN.md */}
                <View style={styles.statusBadge}>
                  <CheckCircle size={14} color={colors.success} strokeWidth={2.4} />
                  <Text variant="labelSmall" style={styles.statusText}>
                    Sessão concluída
                  </Text>
                </View>

                {/* Chip compacto e neutro de RPE legado (somente quando há dados gravados) */}
                {averageRpe !== null && (
                  <View style={styles.rpeChip}>
                    <Text variant="labelSmall" tabular style={styles.rpeChipText}>
                      RPE médio {formatDecimalBR(averageRpe)}
                    </Text>
                  </View>
                )}
              </View>

              <Text variant="displayMedium" style={styles.sessionName}>
                {session?.name || 'Sessão de treino'}
              </Text>
              <Text variant="bodySmall" color="secondary" tabular style={styles.dateSubtitle}>
                {formatDate(session?.endedAt || session?.startedAt)} · Duração {formatDuration(session?.durationMin ?? 0)}
              </Text>
            </View>

            {/* GRADE 2x2 CANÔNICA DE MÉTRICAS (CONSISTÊNCIA COM WORKOUTSUMMARYSCREEN, SEM TRUNCAR EM 360PX) */}
            <View style={styles.metricsGrid}>
              {/* Card 1: Volume total */}
              <Card
                variant="surface"
                style={styles.metricCard}
                accessibilityLabel={`Volume total: ${Math.round(session?.totalVolume ?? 0).toLocaleString('pt-BR')} ${unit}`}
              >
                <View style={styles.metricCardHeader}>
                  <Text variant="labelSmall" color="secondary">
                    Volume total
                  </Text>
                  <Dumbbell size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
                </View>
                <View style={styles.metricCardBottom}>
                  <Text variant="headline" tabular color="coral" style={styles.metricLargeNumber}>
                    {Math.round(session?.totalVolume ?? 0).toLocaleString('pt-BR')}{' '}
                    <Text variant="bodySmall" color="secondary">
                      {unit}
                    </Text>
                  </Text>
                  <Text variant="labelSmall" color="secondary">
                    Volume acumulado
                  </Text>
                </View>
              </Card>

              {/* Card 2: Séries concluídas */}
              <Card
                variant="surface"
                style={styles.metricCard}
                accessibilityLabel={`Séries: ${session?.totalSets ?? 0} concluídas`}
              >
                <View style={styles.metricCardHeader}>
                  <Text variant="labelSmall" color="secondary">
                    Séries
                  </Text>
                  <Layers size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
                </View>
                <View style={styles.metricCardBottom}>
                  <Text variant="headline" tabular style={styles.metricLargeNumber}>
                    {session?.totalSets ?? 0}
                  </Text>
                  <Text variant="labelSmall" color="secondary">
                    séries concluídas
                  </Text>
                </View>
              </Card>

              {/* Card 3: Tempo total */}
              <Card
                variant="surface"
                style={styles.metricCard}
                accessibilityLabel={`Tempo total: ${formatDuration(session?.durationMin ?? 0)}`}
              >
                <View style={styles.metricCardHeader}>
                  <Text variant="labelSmall" color="secondary">
                    Tempo
                  </Text>
                  <Clock size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
                </View>
                <View style={styles.metricCardBottom}>
                  <Text variant="headline" tabular style={styles.metricLargeNumber}>
                    {formatDuration(session?.durationMin ?? 0)}
                  </Text>
                  <Text variant="labelSmall" color="secondary">
                    Duração total
                  </Text>
                </View>
              </Card>

              {/* Card 4: Exercícios */}
              <Card
                variant="surface"
                style={styles.metricCard}
                accessibilityLabel={`Exercícios: ${exercises.length} ${exercises.length === 1 ? 'exercício realizado' : 'exercícios realizados'}`}
              >
                <View style={styles.metricCardHeader}>
                  <Text variant="labelSmall" color="secondary">
                    Exercícios
                  </Text>
                  <Activity size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
                </View>
                <View style={styles.metricCardBottom}>
                  <Text variant="headline" tabular style={styles.metricLargeNumber}>
                    {exercises.length}
                  </Text>
                  <Text variant="labelSmall" color="secondary">
                    {exercises.length === 1 ? 'exercício realizado' : 'exercícios realizados'}
                  </Text>
                </View>
              </Card>
            </View>

            {/* LISTA DE EXERCÍCIOS E SÉRIES REAIS (PADRÃO SETTABLE, SEM CARDCEPTION) */}
            <View style={styles.exercisesSection}>
              <View style={styles.sectionHeaderRow}>
                <Text variant="headline" style={styles.sectionTitle}>
                  Exercícios realizados
                </Text>
                <Text variant="labelSmall" tabular color="secondary">
                  {exercises.length} {exercises.length === 1 ? 'exercício' : 'exercícios'}
                </Text>
              </View>

              {exercises.map((ex, idx) => (
                <Card key={ex.id} variant="surface" style={styles.exerciseCard}>
                  {/* Cabeçalho do exercício */}
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseHeaderLeft}>
                      <View style={styles.exerciseIndexBox}>
                        <Text variant="labelSmall" tabular style={styles.exerciseIndexText}>
                          {String(idx + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      <View style={styles.exerciseTitleCol}>
                        <Text
                          variant="bodyMedium"
                          style={styles.exerciseNameText}
                          numberOfLines={1}
                        >
                          {ex.exerciseName}
                        </Text>
                        <Text variant="bodySmall" color="secondary" numberOfLines={1}>
                          {ex.muscleGroup} • {ex.equipment}
                        </Text>
                      </View>
                    </View>

                    {ex.hasPr && (
                      <View style={styles.exercisePrBadge}>
                        <Trophy size={12} color={colors.pr} strokeWidth={2.4} />
                        <Text variant="labelSmall" style={styles.exercisePrBadgeText}>
                          PR
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Tabela compacta somente-leitura das séries (alinhada à SetTable) */}
                  {ex.sets.length > 0 ? (
                    <View style={styles.setsTable}>
                      {/* Cabeçalho tabular */}
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableColHeader, styles.colSerie]}>Série</Text>
                        <Text style={[styles.tableColHeader, styles.colWeight]}>Carga</Text>
                        <Text style={[styles.tableColHeader, styles.colReps]}>Reps</Text>
                        <Text style={[styles.tableColHeader, styles.colDetail]}>Detalhes</Text>
                      </View>

                      {/* Linhas das séries */}
                      {ex.sets.map((set, sIdx) => {
                        const setBadgeLabel = getSetDisplayLabel(ex.sets, sIdx);
                        const setType = set.type || (set.isWarmup ? 'warmup' : 'normal');
                        const isCompleted = set.completedAt !== null;
                        const isPr = (set.isPrWeight || set.isPrVolume) && setType !== 'warmup' && setType !== 'drop';

                        return (
                          <View
                            key={set.id}
                            style={[
                              styles.setRow,
                              !isCompleted && styles.setRowIncomplete,
                              sIdx === ex.sets.length - 1 && styles.setRowLast,
                            ]}
                          >
                            {/* 1. Badge da série */}
                            <View style={styles.colSerie}>
                              <View
                                style={[
                                  styles.setBadge,
                                  !isCompleted
                                    ? styles.setBadgeIncomplete
                                    : setType === 'warmup'
                                      ? styles.setBadgeWarmup
                                      : setType === 'drop'
                                        ? styles.setBadgeDrop
                                        : setType === 'failure'
                                          ? styles.setBadgeFailure
                                          : styles.setBadgeNormal,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.setBadgeText,
                                    !isCompleted
                                      ? styles.setBadgeTextIncomplete
                                      : setType === 'warmup'
                                        ? styles.setBadgeTextWarmup
                                        : setType === 'drop'
                                          ? styles.setBadgeTextDrop
                                          : setType === 'failure'
                                            ? styles.setBadgeTextFailure
                                            : styles.setBadgeTextNormal,
                                  ]}
                                >
                                  {setBadgeLabel}
                                </Text>
                              </View>
                            </View>

                            {/* 2. Carga em Outfit tabular */}
                            <View style={styles.colWeight}>
                              <Text
                                variant="numberSmall"
                                tabular
                                style={[styles.cellNumber, !isCompleted && styles.cellMuted]}
                              >
                                {formatWeight(set.weight, unit)}
                                <Text variant="labelSmall" color="secondary">
                                  {' '}{unit}
                                </Text>
                              </Text>
                            </View>

                            {/* 3. Repetições em Outfit tabular */}
                            <View style={styles.colReps}>
                              <Text
                                variant="numberSmall"
                                tabular
                                style={[styles.cellNumber, !isCompleted && styles.cellMuted]}
                              >
                                {set.reps}
                                <Text variant="labelSmall" color="secondary">
                                  {' '}reps
                                </Text>
                              </Text>
                            </View>

                            {/* 4. Detalhes (PR sagrado em âmbar, RPE ou Tipo) */}
                            <View style={styles.colDetail}>
                              {!isCompleted ? (
                                <Text variant="labelSmall" style={styles.incompleteTagText}>
                                  Não concluída
                                </Text>
                              ) : isPr ? (
                                <View style={styles.prPill}>
                                  <Trophy size={11} color={colors.pr} strokeWidth={2.4} />
                                  <Text variant="labelSmall" tabular style={styles.prPillText}>
                                    {set.isPrWeight ? 'PR carga' : 'PR volume'}
                                  </Text>
                                </View>
                              ) : set.rpe !== null ? (
                                <Text variant="labelSmall" tabular color="secondary">
                                  RPE {formatDecimalBR(set.rpe)}
                                </Text>
                              ) : setType === 'drop' ? (
                                <Text variant="labelSmall" style={styles.dropTagText}>
                                  Drop set
                                </Text>
                              ) : (
                                <Text variant="bodySmall" color="muted">
                                  —
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    /* Texto discreto quando o exercício não possui séries registradas */
                    <View style={styles.emptySetsNotice}>
                      <Text variant="bodySmall" color="secondary">
                        Nenhuma série registrada
                      </Text>
                    </View>
                  )}
                </Card>
              ))}
            </View>
          </>
        )}
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
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  headerSpacer: {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  heroSection: {
    gap: 6,
    paddingTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(123, 201, 143, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(123, 201, 143, 0.25)',
  },
  statusText: {
    color: colors.success,
    fontSize: 12,
    fontFamily: fontFamilies.dmSansMedium,
  },
  rpeChip: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  rpeChipText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: fontFamilies.dmSansMedium,
    fontVariant: ['tabular-nums'],
  },
  sessionName: {
    fontSize: 26,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  dateSubtitle: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gutter,
  },
  metricCard: {
    flexBasis: '47.5%',
    flexGrow: 1,
    minWidth: 140,
    gap: 10,
    justifyContent: 'space-between',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricCardBottom: {
    gap: 4,
  },
  metricLargeNumber: {
    fontSize: 22,
    fontFamily: fontFamilies.outfitBold,
    fontVariant: ['tabular-nums'],
  },
  exercisesSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  exerciseCard: {
    padding: 14,
    borderRadius: radii.card,
    gap: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  exerciseIndexBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseIndexText: {
    fontSize: 12,
    fontFamily: fontFamilies.outfitBold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  exerciseTitleCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  exerciseNameText: {
    fontSize: 15,
    fontFamily: fontFamilies.outfitSemiBold,
    color: colors.onSurface,
  },
  exercisePrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 196, 107, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 107, 0.3)',
  },
  exercisePrBadgeText: {
    color: colors.pr,
    fontSize: 11,
    fontFamily: fontFamilies.dmSansMedium,
  },
  setsTable: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  tableColHeader: {
    fontSize: 11,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.textMuted,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(58, 53, 49, 0.6)',
  },
  setRowIncomplete: {
    opacity: 0.55,
  },
  setRowLast: {
    borderBottomWidth: 0,
  },
  colSerie: {
    width: 38,
    alignItems: 'flex-start',
  },
  colWeight: {
    flex: 1.2,
    alignItems: 'flex-start',
  },
  colReps: {
    flex: 1,
    alignItems: 'flex-start',
  },
  colDetail: {
    flex: 1.4,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cellNumber: {
    color: colors.onSurface,
  },
  cellMuted: {
    color: colors.textMuted,
  },
  setBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeNormal: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  setBadgeTextNormal: {
    color: colors.onSurface,
  },
  setBadgeWarmup: {
    backgroundColor: 'rgba(255, 122, 89, 0.12)',
  },
  setBadgeTextWarmup: {
    color: colors.primary,
  },
  setBadgeDrop: {
    backgroundColor: 'rgba(255, 122, 89, 0.18)',
  },
  setBadgeTextDrop: {
    color: colors.primary,
  },
  setBadgeFailure: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  setBadgeTextFailure: {
    color: colors.error,
  },
  setBadgeIncomplete: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  setBadgeTextIncomplete: {
    color: colors.textMuted,
  },
  setBadgeText: {
    fontSize: 11,
    fontFamily: fontFamilies.outfitBold,
    fontVariant: ['tabular-nums'],
  },
  prPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 196, 107, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  prPillText: {
    fontSize: 11,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.pr,
    fontVariant: ['tabular-nums'],
  },
  dropTagText: {
    fontSize: 11,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.primary,
  },
  incompleteTagText: {
    fontSize: 11,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.textMuted,
  },
  emptySetsNotice: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  errorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  errorInfo: {
    alignItems: 'center',
    gap: 6,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  retryButton: {
    height: 48,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
});
