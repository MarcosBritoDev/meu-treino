import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  AccessibilityInfo,
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
  TrendingUp,
  ClipboardList,
  Sparkles,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
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
  diffKg: number | null;
}

interface ExerciseLoadSummary {
  id: string;
  exerciseName: string;
  setsCount: number;
  maxWeight: number;
  peakReps: number;
  hasPr: boolean;
}

export const WorkoutSummaryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const sessionId = route.params?.sessionId;

  const [sessionName, setSessionName] = useState('Treino');
  const [durationMin, setDurationMin] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [volumeVariation, setVolumeVariation] = useState<number | null>(null);
  const [completedSets, setCompletedSets] = useState(0);
  const [plannedSets, setPlannedSets] = useState(0);
  const [avgRestS, setAvgRestS] = useState(90);
  const [averageRpe, setAverageRpe] = useState<number | null>(null);
  const [unit, setUnit] = useState('kg');
  const [records, setRecords] = useState<PRRecordItem[]>([]);
  const [exerciseLoads, setExerciseLoads] = useState<ExerciseLoadSummary[]>([]);

  // Animação de entrada curta respeitando "reduzir movimento"
  const animOpacity = useRef(new Animated.Value(0)).current;
  const animTranslateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        animOpacity.setValue(1);
        animTranslateY.setValue(0);
      } else {
        Animated.parallel([
          Animated.timing(animOpacity, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(animTranslateY, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [animOpacity, animTranslateY]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      const rawDb = getExpoDb();

      // 1. Unidade de medida
      const sRows = rawDb.getAllSync<{ unit: string }>(
        'SELECT unit FROM settings WHERE id = 1 LIMIT 1'
      );
      const currentUnit = sRows.length > 0 && sRows[0].unit ? sRows[0].unit : 'kg';
      setUnit(currentUnit);

      // 2. Informações da sessão
      const sessRows = rawDb.getAllSync<{
        workout_id: string | null;
        name_snapshot: string;
        started_at: number;
        ended_at: number | null;
      }>(
        `SELECT workout_id, name_snapshot, started_at, ended_at FROM sessions WHERE id = ?`,
        [sessionId]
      );

      let currentWorkoutId: string | null = null;
      let sessionStartedAt = Date.now();
      let sessionEndedAt = Date.now();

      if (sessRows.length > 0) {
        const s = sessRows[0];
        setSessionName(s.name_snapshot);
        currentWorkoutId = s.workout_id;
        sessionStartedAt = s.started_at;
        sessionEndedAt = s.ended_at || Date.now();
        const durMs = Math.max(60000, sessionEndedAt - sessionStartedAt);
        setDurationMin(Math.max(1, Math.round(durMs / 60000)));
      }

      // 3. Métricas de séries e volume total
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

      const curVolume = metricsRows.length > 0 ? metricsRows[0].totalVol : 0;
      const curSetsCount = metricsRows.length > 0 ? metricsRows[0].setsCount : 0;
      setTotalVolume(curVolume);
      setCompletedSets(curSetsCount);
      setAverageRpe(
        metricsRows.length > 0 && metricsRows[0].avgRpe !== null
          ? Number(metricsRows[0].avgRpe.toFixed(1))
          : null
      );

      // 4. Séries planejadas (alvo) e descanso médio
      const planRows = rawDb.getAllSync<{
        totalPlannedSets: number;
        avgRest: number | null;
      }>(
        `SELECT 
          COALESCE(SUM(target_sets), 0) AS totalPlannedSets,
          AVG(rest_s) AS avgRest
         FROM session_exercises
         WHERE session_id = ?`,
        [sessionId]
      );

      if (planRows.length > 0) {
        setPlannedSets(planRows[0].totalPlannedSets || curSetsCount);
        setAvgRestS(planRows[0].avgRest ? Math.round(planRows[0].avgRest) : 90);
      }

      // 5. Comparativo com sessão anterior do mesmo treino
      if (currentWorkoutId) {
        const prevSessRows = rawDb.getAllSync<{ prevVolume: number }>(
          `SELECT 
            COALESCE(SUM(st.weight * st.reps), 0) AS prevVolume
           FROM sessions s
           JOIN session_exercises se ON se.session_id = s.id
           JOIN sets st ON st.session_exercise_id = se.id AND st.completed_at IS NOT NULL
           WHERE s.workout_id = ? AND s.status = 'completed' AND s.id != ? AND s.ended_at < ?
           GROUP BY s.id
           ORDER BY s.ended_at DESC
           LIMIT 1`,
          [currentWorkoutId, sessionId, sessionEndedAt]
        );

        if (prevSessRows.length > 0 && prevSessRows[0].prevVolume > 0) {
          const prevVol = prevSessRows[0].prevVolume;
          const diffPct = Math.round(((curVolume - prevVol) / prevVol) * 100);
          setVolumeVariation(diffPct);
        } else {
          setVolumeVariation(null);
        }
      } else {
        setVolumeVariation(null);
      }

      // 6. Recordes da sessão (PRs)
      const prRows = rawDb.getAllSync<{
        id: string;
        exercise_id: string;
        exerciseName: string;
        weight: number;
        reps: number;
        isPrWeight: number;
        isPrVolume: number;
      }>(
        `SELECT 
          st.id,
          se.exercise_id,
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

      const prList: PRRecordItem[] = [];
      for (const r of prRows) {
        // Busca a carga máxima anterior em treinos passados para calcular o delta
        const prevMaxRows = rawDb.getAllSync<{ prevMax: number | null }>(
          `SELECT MAX(st.weight) AS prevMax
           FROM sets st
           JOIN session_exercises se ON st.session_exercise_id = se.id
           JOIN sessions s ON se.session_id = s.id
           WHERE se.exercise_id = ? AND s.status = 'completed' AND s.id != ? AND st.completed_at IS NOT NULL`,
          [r.exercise_id, sessionId]
        );

        let diffKg: number | null = null;
        if (prevMaxRows.length > 0 && prevMaxRows[0].prevMax !== null) {
          const delta = r.weight - prevMaxRows[0].prevMax;
          if (delta > 0) diffKg = Number(delta.toFixed(1));
        }

        prList.push({
          id: r.id,
          exerciseName: r.exerciseName,
          weight: r.weight,
          reps: r.reps,
          isPrWeight: Boolean(r.isPrWeight),
          isPrVolume: Boolean(r.isPrVolume),
          diffKg,
        });
      }
      setRecords(prList);

      // 7. Resumo das cargas por exercício
      const exGroupRows = rawDb.getAllSync<{
        id: string;
        exerciseName: string;
        setsCount: number;
        maxWeight: number;
        hasPr: number;
      }>(
        `SELECT 
          se.id,
          e.name AS exerciseName,
          COUNT(st.id) AS setsCount,
          COALESCE(MAX(st.weight), 0) AS maxWeight,
          MAX(CASE WHEN st.is_pr_weight = 1 OR st.is_pr_volume = 1 THEN 1 ELSE 0 END) AS hasPr
         FROM session_exercises se
         JOIN exercises e ON se.exercise_id = e.id
         LEFT JOIN sets st ON st.session_exercise_id = se.id AND st.completed_at IS NOT NULL
         WHERE se.session_id = ?
         GROUP BY se.id, se.position, e.name
         ORDER BY se.position ASC`,
        [sessionId]
      );

      const loadSummaries: ExerciseLoadSummary[] = [];
      for (const ex of exGroupRows) {
        // Obtém o número de repetições correspondente à carga máxima (pico)
        const peakRows = rawDb.getAllSync<{ reps: number }>(
          `SELECT reps FROM sets 
           WHERE session_exercise_id = ? AND weight = ? AND completed_at IS NOT NULL
           ORDER BY reps DESC LIMIT 1`,
          [ex.id, ex.maxWeight]
        );
        const peakReps = peakRows.length > 0 ? peakRows[0].reps : 0;

        loadSummaries.push({
          id: ex.id,
          exerciseName: ex.exerciseName,
          setsCount: ex.setsCount,
          maxWeight: ex.maxWeight,
          peakReps,
          hasPr: Boolean(ex.hasPr),
        });
      }
      setExerciseLoads(loadSummaries);
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

  const handleViewSessionDetails = () => {
    triggerHaptic('light');
    if (!sessionId) return;
    navigation.navigate('SessionDetail', { sessionId });
  };

  const plannedPercent =
    plannedSets > 0 ? Math.round((completedSets / plannedSets) * 100) : 100;

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

        <View style={styles.headerRightBox}>
          <Zap size={18} color="#FFC46B" fill="#FFC46B" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: animOpacity,
            transform: [{ translateY: animTranslateY }],
            gap: 22,
          }}
        >
          {/* TOPO COMEMORATIVO */}
          <View style={styles.celebrationSection}>
            <View style={styles.badgeOuter}>
              <View style={styles.badgeInner}>
                <Check size={34} color={colors.background} strokeWidth={3.2} />
              </View>
              <View style={styles.badgeSparkle}>
                <Zap size={14} color="#FFC46B" fill="#FFC46B" />
              </View>
            </View>

            <Text variant="headline" style={styles.congratsTitle}>
              Treino concluído!
            </Text>
            <Text variant="bodyMedium" style={styles.congratsSubtitle}>
              {sessionName} finalizado em {durationMin}{' '}
              {durationMin === 1 ? 'minuto' : 'minutos'}
            </Text>
          </View>

          {/* GRADE 2x2 DE MÉTRICAS PRINCIPAIS */}
          <View style={styles.metricsGrid}>
            {/* Card 1: Volume Total */}
            <Card variant="surface" style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <Text variant="labelSmall" color="secondary">
                  Volume total
                </Text>
                <Dumbbell size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
              </View>
              <View style={styles.metricCardBottom}>
                <Text variant="headline" style={styles.metricValue}>
                  {Math.round(totalVolume).toLocaleString('pt-BR')}{' '}
                  <Text variant="bodySmall" color="secondary">
                    {unit}
                  </Text>
                </Text>
                {volumeVariation !== null && (
                  <View style={styles.variationPill}>
                    <TrendingUp size={12} color="#4ADE80" strokeWidth={2.4} />
                    <Text variant="labelSmall" style={styles.variationPillText}>
                      {volumeVariation >= 0
                        ? `+${volumeVariation}% vs sem. ant.`
                        : `${volumeVariation}% vs sem. ant.`}
                    </Text>
                  </View>
                )}
              </View>
            </Card>

            {/* Card 2: Séries */}
            <Card variant="surface" style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <Text variant="labelSmall" color="secondary">
                  Séries
                </Text>
                <Layers size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
              </View>
              <View style={styles.metricCardBottom}>
                <Text variant="headline" style={styles.metricValue}>
                  {completedSets}
                </Text>
                <Text variant="labelSmall" style={styles.metricSubtitleText}>
                  {plannedPercent}% planejadas
                </Text>
              </View>
            </Card>

            {/* Card 3: Tempo */}
            <Card variant="surface" style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <Text variant="labelSmall" color="secondary">
                  Tempo
                </Text>
                <Timer size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
              </View>
              <View style={styles.metricCardBottom}>
                <Text variant="headline" style={styles.metricValue}>
                  {durationMin}{' '}
                  <Text variant="bodySmall" color="secondary">
                    min
                  </Text>
                </Text>
                <Text
                  variant="labelSmall"
                  style={styles.metricSubtitleText}
                  numberOfLines={1}
                >
                  Descanso médio {avgRestS} s
                </Text>
              </View>
            </Card>

            {/* Card 4: Intensidade ou Exercícios */}
            <Card variant="surface" style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <Text variant="labelSmall" color="secondary">
                  {averageRpe !== null ? 'Intensidade' : 'Exercícios'}
                </Text>
                <Activity
                  size={18}
                  color={averageRpe !== null ? colors.primary : colors.onSurfaceVariant}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.metricCardBottom}>
                <Text variant="headline" style={styles.metricValue}>
                  {averageRpe !== null ? `RPE ${averageRpe}` : exerciseLoads.length}
                </Text>
                {averageRpe !== null ? (
                  <View style={styles.targetZonePill}>
                    <Text variant="labelSmall" style={styles.targetZonePillText}>
                      Zona alvo
                    </Text>
                  </View>
                ) : (
                  <Text variant="labelSmall" style={styles.metricSubtitleText}>
                    {exerciseLoads.length} concluídos
                  </Text>
                )}
              </View>
            </Card>
          </View>

          {/* SEÇÃO RECORDES DA SESSÃO (Só aparece quando houver PR) */}
          {records.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text variant="headline" style={styles.sectionTitle}>
                  Recordes da sessão
                </Text>
                <View style={styles.recordsBadge}>
                  <Trophy size={14} color="#FFC46B" strokeWidth={2.4} />
                  <Text variant="labelSmall" style={styles.recordsBadgeText}>
                    {records.length} {records.length === 1 ? 'novo PR' : 'novos PRs'}
                  </Text>
                </View>
              </View>

              <View style={styles.recordsList}>
                {records.map((rec) => (
                  <Card key={rec.id} variant="surface" style={styles.recordCard}>
                    <View style={styles.recordLeft}>
                      <View style={styles.trophyIconBox}>
                        <Trophy size={20} color="#FFC46B" strokeWidth={2.2} />
                      </View>
                      <View style={styles.recordInfoCol}>
                        <Text
                          variant="bodyMedium"
                          style={styles.recordExerciseName}
                          numberOfLines={1}
                        >
                          {rec.exerciseName}
                        </Text>
                        <Text variant="headline" style={styles.recordWeightText}>
                          {rec.weight} {unit}{' '}
                          <Text variant="bodySmall" color="secondary">
                            × {rec.reps}
                          </Text>
                        </Text>
                      </View>
                    </View>

                    <View style={styles.prDeltaPill}>
                      <Text variant="labelSmall" style={styles.prDeltaPillText}>
                        {rec.diffKg !== null && rec.diffKg > 0
                          ? `+${rec.diffKg} kg recorde`
                          : rec.isPrWeight
                            ? 'Carga recorde'
                            : 'Volume recorde'}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}

          {/* SEÇÃO RESUMO DAS CARGAS */}
          {exerciseLoads.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text variant="headline" style={styles.sectionTitle}>
                  Resumo das cargas
                </Text>
                <Text variant="labelSmall" color="secondary">
                  {exerciseLoads.length}{' '}
                  {exerciseLoads.length === 1 ? 'exercício' : 'exercícios'}
                </Text>
              </View>

              <View style={styles.exerciseLoadsList}>
                {exerciseLoads.map((item, index) => (
                  <View key={item.id} style={styles.loadItemCard}>
                    <View style={styles.loadItemLeft}>
                      <View
                        style={[
                          styles.indexBadge,
                          item.hasPr && styles.indexBadgePr,
                        ]}
                      >
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.indexBadgeText,
                            item.hasPr && styles.indexBadgeTextPr,
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View style={styles.loadItemInfoCol}>
                        <Text
                          variant="bodyMedium"
                          style={styles.loadExerciseName}
                          numberOfLines={1}
                        >
                          {item.exerciseName}
                        </Text>
                        {item.hasPr ? (
                          <View style={styles.prRowNotice}>
                            <View style={styles.prDot} />
                            <Text variant="labelSmall" style={styles.prNoticeText}>
                              Novo recorde
                            </Text>
                          </View>
                        ) : (
                          <Text variant="labelSmall" color="secondary">
                            {item.setsCount}{' '}
                            {item.setsCount === 1 ? 'série registrada' : 'séries registradas'}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.loadItemRight}>
                      <Text
                        variant="headline"
                        style={[
                          styles.loadWeightText,
                          item.hasPr && styles.loadWeightTextPr,
                        ]}
                      >
                        {item.maxWeight} {unit}
                      </Text>
                      <Text variant="labelSmall" color="secondary">
                        pico: {item.peakReps} reps
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* AÇÕES DE RODAPÉ (INLINE NO SCROLLVIEW PARA RESPEITAR O SAFE-AREA) */}
          <View style={styles.footerActions}>
            {/* Botão Secundário: Ver registros da sessão */}
            <Pressable
              onPress={handleViewSessionDetails}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ver registros da sessão"
            >
              <ClipboardList size={20} color={colors.onSurface} strokeWidth={2} />
              <Text variant="bodyLarge" style={styles.secondaryButtonText}>
                Ver registros da sessão
              </Text>
            </Pressable>

            {/* Botão Primário: Voltar ao início */}
            <Pressable
              onPress={handleFinish}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Voltar ao início"
            >
              <Text variant="bodyLarge" style={styles.primaryButtonText}>
                Voltar ao início
              </Text>
            </Pressable>
          </View>
        </Animated.View>
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  headerRightBox: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 196, 107, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  celebrationSection: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 8,
  },
  badgeOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 122, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
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
    padding: 14,
    borderRadius: 16,
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
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
  metricValue: {
    fontSize: 22,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  metricSubtitleText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  variationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  variationPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ADE80',
  },
  targetZonePill: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  targetZonePillText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  sectionContainer: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
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
    gap: 10,
  },
  recordCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  trophyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 196, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 107, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfoCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  recordExerciseName: {
    fontSize: 15,
    fontFamily: fontFamilies.outfitSemiBold,
    color: colors.onSurface,
  },
  recordWeightText: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  prDeltaPill: {
    backgroundColor: 'rgba(255, 196, 107, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  prDeltaPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.pr,
  },
  exerciseLoadsList: {
    gap: 10,
  },
  loadItemCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadgePr: {
    backgroundColor: 'rgba(255, 196, 107, 0.2)',
  },
  indexBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  indexBadgeTextPr: {
    color: colors.pr,
  },
  loadItemInfoCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  loadExerciseName: {
    fontSize: 15,
    fontFamily: fontFamilies.outfitSemiBold,
    color: colors.onSurface,
  },
  prRowNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  prDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.pr,
  },
  prNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.pr,
  },
  loadItemRight: {
    alignItems: 'flex-end',
    gap: 2,
    paddingLeft: 8,
  },
  loadWeightText: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  loadWeightTextPr: {
    color: colors.pr,
  },
  footerActions: {
    marginTop: 10,
    gap: 12,
  },
  secondaryButton: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: fontFamilies.outfitSemiBold,
    color: colors.onSurface,
  },
  primaryButton: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    color: colors.background,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
