import React, { useState, useMemo, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  MoreVertical,
  Trophy,
  TrendingUp,
  Calendar,
  Lightbulb,
  Plus,
  Dumbbell,
  Info,
  Sparkles,
  Pencil,
  Archive,
  ChevronRight,
  Zap,
  Weight,
  Cable,
  User,
  Boxes,
  Sliders,
  CircleDot,
  ShieldCheck,
  HeartPulse,
  Ellipsis,
  Star,
} from 'lucide-react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Line,
  Path,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography, fontFamilies } from '../theme';
import {
  ScreenHeader,
  Text,
  Button,
  PRBadge,
  BottomSheet,
  ConfirmModal,
  Toast,
  triggerHaptic,
} from '../ui';
import {
  getExerciseById,
  getExerciseRecords,
  getExerciseSessionHistory,
  getExerciseEvolutionPoints,
  getActiveWorkouts,
  addExerciseToWorkout,
  createQuickWorkout,
  archiveExercise,
  WorkoutOption,
} from '../db/library';
import {
  deriveBodyRegion,
  parseExecutionTips,
  filterEvolutionByPeriod,
  formatPtBrDateMedium,
  formatPtBrDateLong,
  formatPtBrDateDayMonth,
  ExerciseItemData,
} from '../domain/search';
import {
  parseSecondaryMuscles,
  normalizeEquipmentName,
} from '../domain/exerciseCatalog';
import { formatarPeso } from '../domain/weight';
import { useSettingsStore } from '../store/useSettingsStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ExerciseDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'ExerciseDetail'>>();
  const exerciseId = route.params?.exerciseId;

  const unit = useSettingsStore((state) => state.unit);

  // Estados locais
  const [exercise, setExercise] = useState<ExerciseItemData | null>(null);
  const [period, setPeriod] = useState<'4 sem' | '3 meses' | 'tudo'>('4 sem');
  const [menuVisible, setMenuVisible] = useState(false);
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutOption[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Carrega / recarrega os dados do exercício
  const loadExerciseData = useCallback(() => {
    if (!exerciseId) return;
    const ex = getExerciseById(exerciseId);
    setExercise(ex);
    setRefreshTrigger((prev) => prev + 1);
  }, [exerciseId]);

  useFocusEffect(
    useCallback(() => {
      loadExerciseData();
    }, [loadExerciseData])
  );

  // Consulta recordes pessoais (Maior carga e Melhor volume)
  const records = useMemo(() => {
    if (!exerciseId) return { maxWeight: null, maxVolume: null };
    return getExerciseRecords(exerciseId);
  }, [exerciseId, refreshTrigger]);

  const hasRecords = Boolean(records.maxWeight && records.maxWeight.weight > 0);

  // Consulta pontos brutos de evolução para o gráfico
  const rawEvolutionPoints = useMemo(() => {
    if (!exerciseId || !hasRecords) return [];
    return getExerciseEvolutionPoints(exerciseId);
  }, [exerciseId, hasRecords, refreshTrigger]);

  // Estatísticas e pontos filtrados conforme período selecionado
  const evolutionStats = useMemo(() => {
    return filterEvolutionByPeriod(rawEvolutionPoints, period);
  }, [rawEvolutionPoints, period]);

  // Consulta histórico de sessões
  const sessionHistory = useMemo(() => {
    if (!exerciseId || !hasRecords) return [];
    return getExerciseSessionHistory(exerciseId, records.maxWeight?.weight);
  }, [exerciseId, hasRecords, records.maxWeight?.weight, refreshTrigger]);

  // Dicas de execução técnicas a partir das anotações salvas
  const tips = useMemo(() => {
    return parseExecutionTips(exercise?.notes);
  }, [exercise?.notes]);

  // Região corporal derivada do músculo
  const bodyRegion = useMemo(() => {
    return deriveBodyRegion(exercise?.muscleGroup ?? '');
  }, [exercise?.muscleGroup]);

  // Músculos secundários parseados
  const secondaryMusclesList = useMemo(() => {
    return parseSecondaryMuscles(exercise?.secondaryMuscles);
  }, [exercise?.secondaryMuscles]);

  const isDumbbell = useMemo(() => {
    return Boolean(exercise?.equipment?.toLowerCase().includes('halter'));
  }, [exercise?.equipment]);

  // Verifica se o modelo possui campo de favorito
  const hasFavoriteField = Boolean(exercise && 'isFavorite' in exercise);
  const isFavoriteActive = Boolean(exercise && (exercise as any).isFavorite);

  // Navega para edição no NewExerciseScreen
  const handleOpenEdit = useCallback(() => {
    if (!exercise) return;
    triggerHaptic('light');
    setMenuVisible(false);
    navigation.navigate('NewExercise', {
      exerciseId: exercise.id,
      initialName: exercise.name,
      fromScreen: 'Biblioteca',
    });
  }, [exercise, navigation]);

  // Abre bottom sheet para escolher treino
  const handleOpenAddToWorkout = useCallback(() => {
    triggerHaptic('light');
    const active = getActiveWorkouts();
    setWorkouts(active);
    setBottomSheetVisible(true);
  }, []);

  // Adiciona exercício ao treino selecionado
  const handleSelectWorkout = useCallback(
    (workout: WorkoutOption) => {
      if (!exerciseId) return;
      try {
        addExerciseToWorkout(workout.id, exerciseId);
        triggerHaptic('success');
        setBottomSheetVisible(false);
        setToastMessage(`Exercício adicionado a ${workout.name}`);
        setToastVisible(true);
      } catch (err) {
        console.warn('Erro ao adicionar exercício:', err);
      }
    },
    [exerciseId]
  );

  // Cria treino rápido padrão se não houver treinos
  const handleCreateAndAdd = useCallback(() => {
    if (!exerciseId) return;
    try {
      const newWorkout = createQuickWorkout('Treino A');
      addExerciseToWorkout(newWorkout.id, exerciseId);
      triggerHaptic('success');
      setBottomSheetVisible(false);
      setToastMessage('Treino A criado e exercício adicionado');
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao criar treino rápido:', err);
    }
  }, [exerciseId]);

  // Confirma arquivamento do exercício
  const handleConfirmArchive = useCallback(() => {
    if (!exerciseId) return;
    try {
      archiveExercise(exerciseId);
      triggerHaptic('medium');
      setArchiveModalVisible(false);
      navigation.goBack();
    } catch (err) {
      console.warn('Erro ao arquivar exercício:', err);
    }
  }, [exerciseId, navigation]);

  const renderEquipmentIcon = (equipmentName: string) => {
    const norm = normalizeEquipmentName(equipmentName);
    switch (norm) {
      case 'Barra':
        return <Weight size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />;
      case 'Halteres':
        return <Dumbbell size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />;
      case 'Máquina':
        return <Boxes size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />;
      case 'Cabo / Polia':
        return <Cable size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />;
      case 'Peso corporal':
        return <User size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />;
      case 'Smith':
        return <Sliders size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />;
      case 'Kettlebell':
        return <CircleDot size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />;
      case 'Barra de segurança':
        return <ShieldCheck size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />;
      case 'Cardio':
        return <HeartPulse size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />;
      case 'Outro':
      default:
        return <Ellipsis size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />;
    }
  };

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Exercício"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.notFoundContainer}>
          <Text variant="bodyLarge" color="secondary">
            Exercício não encontrado ou foi removido.
          </Text>
          <Button
            title="Voltar para a biblioteca"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.notFoundButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Renderização do gráfico SVG vetorial limpo (apenas com >= 2 sessões)
  const renderEvolutionChart = () => {
    const points = evolutionStats.points;
    if (points.length < 2) return null;

    const weights = points.map((p) => p.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const diff = maxW - minW;

    const yMax = diff === 0 ? maxW + 2 : maxW + diff * 0.15;
    const yMin = diff === 0 ? Math.max(0, minW - 2) : Math.max(0, minW - diff * 0.15);
    const yRange = yMax - yMin || 1;

    const startX = 45;
    const endX = 315;
    const topY = 20;
    const bottomY = 110;
    const chartWidth = endX - startX;
    const chartHeight = bottomY - topY;

    const coords = points.map((p, idx) => {
      const x = startX + (idx / (points.length - 1)) * chartWidth;
      const normalizedY = (p.weight - yMin) / yRange;
      const y = bottomY - normalizedY * chartHeight;
      return { x, y, weight: p.weight, date: p.date };
    });

    const linePath = coords.reduce(
      (acc, c, idx) => (idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`),
      ''
    );

    const areaPath = coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${bottomY + 5} L ${coords[0].x} ${bottomY + 5} Z`
      : '';

    const midWeight = (yMax + yMin) / 2;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeaderRow}>
          <View style={styles.chartPeakRow}>
            <Text variant="labelSmall" color="secondary">
              Pico atual:
            </Text>
            <Text variant="bodyLarge" tabular style={styles.chartPeakValue}>
              {formatarPeso(evolutionStats.peakWeight, unit)}
            </Text>
          </View>

          {/* Seletor de período */}
          <View style={styles.periodChipsRow}>
            {(['4 sem', '3 meses', 'tudo'] as const).map((p) => {
              const isSelected = period === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => {
                    triggerHaptic('selection');
                    setPeriod(p);
                  }}
                  style={[
                    styles.periodChip,
                    isSelected && styles.periodChipSelected,
                  ]}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por ${p}`}
                >
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.periodChipText,
                      isSelected && styles.periodChipTextSelected,
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Gráfico vetorial limpo sem sombras */}
        <View style={styles.svgWrapper}>
          <Svg viewBox="0 0 340 130" style={styles.svgStyle}>
            <Defs>
              <LinearGradient id="evolutionGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.30" />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Linhas de grade sutis */}
            <Line
              x1={startX - 10}
              x2={endX + 15}
              y1={topY}
              y2={topY}
              stroke={colors.outline}
              strokeDasharray="3 3"
              strokeOpacity={0.25}
            />
            <SvgText
              x={6}
              y={topY + 4}
              fill={colors.onSurfaceVariant}
              fontSize={10}
              fontFamily="Outfit"
            >
              {formatarPeso(yMax, unit)}
            </SvgText>

            <Line
              x1={startX - 10}
              x2={endX + 15}
              y1={(topY + bottomY) / 2}
              y2={(topY + bottomY) / 2}
              stroke={colors.outline}
              strokeDasharray="3 3"
              strokeOpacity={0.25}
            />
            <SvgText
              x={6}
              y={(topY + bottomY) / 2 + 4}
              fill={colors.onSurfaceVariant}
              fontSize={10}
              fontFamily="Outfit"
            >
              {formatarPeso(midWeight, unit)}
            </SvgText>

            <Line
              x1={startX - 10}
              x2={endX + 15}
              y1={bottomY}
              y2={bottomY}
              stroke={colors.outline}
              strokeOpacity={0.25}
            />
            <SvgText
              x={6}
              y={bottomY + 4}
              fill={colors.onSurfaceVariant}
              fontSize={10}
              fontFamily="Outfit"
            >
              {formatarPeso(yMin, unit)}
            </SvgText>

            {/* Área sombreada suave */}
            {areaPath ? <Path d={areaPath} fill="url(#evolutionGrad)" /> : null}

            {/* Curva coral primária #FF7A59 */}
            {linePath ? (
              <Path
                d={linePath}
                fill="none"
                stroke={colors.primary}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Pontos nas coordenadas */}
            {coords.map((c, idx) => {
              const isLast = idx === coords.length - 1;
              return (
                <React.Fragment key={`pt-${idx}`}>
                  {isLast && (
                    <Circle
                      cx={c.x}
                      cy={c.y}
                      r={10}
                      fill={colors.primary}
                      fillOpacity={0.2}
                    />
                  )}
                  <Circle
                    cx={c.x}
                    cy={c.y}
                    r={isLast ? 6 : 4.5}
                    fill={isLast ? colors.primary : colors.surfaceContainer}
                    stroke={isLast ? colors.background : colors.primary}
                    strokeWidth={isLast ? 2 : 2.5}
                  />
                </React.Fragment>
              );
            })}
          </Svg>
        </View>

        {/* Eixo X com datas curtas em Outfit tabular */}
        <View style={styles.xAxisRow}>
          {coords.map((c, idx) => {
            const isLast = idx === coords.length - 1;
            return (
              <Text
                key={`label-${idx}`}
                variant="labelSmall"
                tabular
                style={[
                  styles.xAxisLabel,
                  isLast && styles.xAxisLabelLast,
                ]}
              >
                {formatPtBrDateDayMonth(c.date)}
              </Text>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. CABEÇALHO */}
      <ScreenHeader
        title="Detalhes do exercício"
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerRightActions}>
            {hasFavoriteField && (
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  // Se existir no modelo, acionaria atualização
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Favoritar exercício"
                style={styles.headerIconButton}
              >
                <Star
                  size={20}
                  color={isFavoriteActive ? colors.primary : colors.onSurfaceVariant}
                  fill={isFavoriteActive ? colors.primary : 'none'}
                  strokeWidth={1.75}
                />
              </Pressable>
            )}

            <Pressable
              onPress={handleOpenEdit}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Editar exercício"
              style={styles.headerIconButton}
            >
              <Pencil size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setMenuVisible(true);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Mais opções"
              style={styles.headerIconButton}
            >
              <MoreVertical size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. IDENTIFICAÇÃO DO EXERCÍCIO */}
        <View style={styles.exerciseHeaderBlock}>
          {bodyRegion ? (
            <View style={styles.regionRow}>
              <Dumbbell size={15} color={colors.onSurfaceVariant} strokeWidth={1.75} />
              <Text variant="labelSmall" style={styles.regionText}>
                {bodyRegion}
              </Text>
            </View>
          ) : null}

          <Text variant="displayMedium" style={styles.exerciseName}>
            {exercise.name}
          </Text>

          {/* Linha de chips informativos */}
          <View style={styles.chipsRow}>
            {/* Músculo principal destacado em #3A251F / #FF7A59 */}
            <View style={styles.primaryMuscleChip}>
              <Text variant="labelSmall" style={styles.primaryMuscleChipText}>
                {exercise.muscleGroup}
              </Text>
            </View>

            {/* Equipamento com ícone */}
            <View style={styles.infoPill}>
              {renderEquipmentIcon(exercise.equipment)}
              <Text variant="labelSmall" style={styles.infoPillText}>
                {exercise.equipment}
              </Text>
            </View>

            {/* Tipo de meta padrão */}
            <View style={styles.infoPill}>
              <Text variant="labelSmall" style={styles.infoPillTextMuted}>
                {exercise.defaultTargetType === 'time' ? 'Meta: tempo' : 'Meta: repetições'}
              </Text>
            </View>

            {/* Tipo (Composto / Isolamento) */}
            {exercise.kind ? (
              <View style={styles.infoPill}>
                <Text variant="labelSmall" style={styles.infoPillTextMuted}>
                  {exercise.kind === 'composto' ? 'Composto' : 'Isolamento'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Linha discreta para músculos secundários */}
          {secondaryMusclesList.length > 0 && (
            <Text variant="bodySmall" color="secondary" style={styles.secondaryMusclesLine}>
              Secundários: {secondaryMusclesList.join(', ')}
            </Text>
          )}
        </View>

        {/* 3. RECORDES PESSOAIS (GRADE 2 COLUNAS, RADII.CARD 24PX, FLAT TONAL) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.trophyIconBox}>
                <Trophy size={14} color={colors.onPrimary} strokeWidth={2} />
              </View>
              <Text variant="bodyLarge" style={styles.sectionTitle}>
                Recordes pessoais
              </Text>
            </View>
            <Text variant="labelSmall" color="secondary">
              Ciclo atual
            </Text>
          </View>

          {hasRecords ? (
            <View style={styles.bentoGrid}>
              {/* Card 1: Maior carga */}
              <View style={styles.bentoCard}>
                <View>
                  <View style={styles.recordHeaderRow}>
                    <Text variant="labelSmall" color="secondary">
                      Maior carga
                    </Text>
                    {isDumbbell && (
                      <Text variant="labelSmall" color="secondary" style={styles.dumbbellPill}>
                        Halteres (2×)
                      </Text>
                    )}
                  </View>

                  <View style={styles.recordValueRow}>
                    <Text variant="displayLarge" tabular style={styles.recordNumber}>
                      {records.maxWeight?.weight ?? '—'}
                    </Text>
                    <Text variant="bodyLarge" style={styles.recordUnit}>
                      {unit}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordFooter}>
                  <Text variant="labelSmall" tabular style={styles.recordReps}>
                    {records.maxWeight ? `× ${records.maxWeight.reps} reps` : '—'}
                  </Text>
                  <Text variant="labelSmall" color="secondary">
                    {formatPtBrDateMedium(records.maxWeight?.completedAt ?? null)}
                  </Text>
                </View>
              </View>

              {/* Card 2: Melhor volume */}
              <View style={styles.bentoCard}>
                <View>
                  <View style={styles.recordHeaderRow}>
                    <Text variant="labelSmall" color="secondary">
                      Melhor volume
                    </Text>
                    {isDumbbell && (
                      <Text variant="labelSmall" color="secondary" style={styles.dumbbellPill}>
                        Volume total (2×)
                      </Text>
                    )}
                  </View>

                  <View style={styles.recordValueRow}>
                    <Text variant="displayLarge" tabular style={styles.recordNumber}>
                      {records.maxVolume ? Math.round(records.maxVolume.volume) : '—'}
                    </Text>
                    <Text variant="bodyLarge" style={styles.recordUnit}>
                      {unit}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordFooter}>
                  <Text variant="labelSmall" tabular style={styles.recordReps}>
                    {records.maxVolume
                      ? `${formatarPeso(records.maxVolume.weight, unit)} × ${records.maxVolume.reps}`
                      : '—'}
                  </Text>
                  <Text variant="labelSmall" color="secondary">
                    Volume série
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyRecordsCard}>
              <View style={styles.bentoGrid}>
                <View style={styles.bentoCard}>
                  <Text variant="labelSmall" color="secondary">
                    Maior carga
                  </Text>
                  <Text variant="displayLarge" tabular style={styles.recordNumberEmpty}>
                    —
                  </Text>
                  <Text variant="labelSmall" color="secondary">
                    Sem registros
                  </Text>
                </View>
                <View style={styles.bentoCard}>
                  <Text variant="labelSmall" color="secondary">
                    Melhor volume
                  </Text>
                  <Text variant="displayLarge" tabular style={styles.recordNumberEmpty}>
                    —
                  </Text>
                  <Text variant="labelSmall" color="secondary">
                    Sem registros
                  </Text>
                </View>
              </View>

              <View style={styles.emptyRecordsNotice}>
                <Info size={16} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                <Text variant="bodySmall" color="secondary" style={styles.emptyNoticeText}>
                  Registre este exercício para ver sua evolução
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 4. EVOLUÇÃO DE CARGA (EXIBIDO APENAS QUANDO HOUVER >= 2 SESSÕES) */}
        {hasRecords && evolutionStats.points.length >= 2 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleLeft}>
                <TrendingUp size={20} color={colors.primary} strokeWidth={1.75} />
                <Text variant="bodyLarge" style={styles.sectionTitle}>
                  Evolução de carga
                </Text>
              </View>

              {/* Badge de variação no ciclo */}
              <View style={styles.cycleBadge}>
                <TrendingUp size={12} color={colors.onPrimary} strokeWidth={2} />
                <Text variant="labelSmall" style={styles.cycleBadgeText}>
                  {`${evolutionStats.cycleChangePercent >= 0 ? '+' : ''}${evolutionStats.cycleChangePercent
                    .toFixed(1)
                    .replace('.', ',')}% no ciclo`}
                </Text>
              </View>
            </View>

            {renderEvolutionChart()}
          </View>
        )}

        {/* 5. HISTÓRICO DE SESSÕES (SEM EXIBIÇÃO DE RPE) */}
        {hasRecords && sessionHistory.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleLeft}>
                <Calendar size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                <Text variant="bodyLarge" style={styles.sectionTitle}>
                  Histórico
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text variant="labelSmall" style={styles.countBadgeText}>
                  {`${sessionHistory.length} ${sessionHistory.length === 1 ? 'sessão' : 'sessões'}`}
                </Text>
              </View>
            </View>

            <View style={styles.historyList}>
              {sessionHistory.map((item) => (
                <View key={item.sessionId} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text variant="bodyMedium" style={styles.historyDate}>
                      {formatPtBrDateLong(item.date)}
                    </Text>
                    {item.isAllTimePR ? (
                      <PRBadge label="Recorde" />
                    ) : (
                      <Text variant="labelSmall" color="secondary">
                        Sessão regular
                      </Text>
                    )}
                  </View>

                  <View style={styles.historyBestRow}>
                    <Text variant="headline" tabular style={styles.historyBestSet}>
                      {`${formatarPeso(item.bestWeight, unit)} × ${item.bestReps}`}
                    </Text>
                    <Text variant="labelSmall" color="secondary" style={styles.historyBestLabel}>
                      melhor série
                    </Text>
                  </View>

                  <View style={styles.historyMetaRow}>
                    <Text variant="labelSmall" tabular color="secondary">
                      {`vol. ${formatarPeso(item.totalVolume, unit)}`}
                    </Text>
                    <Text variant="labelSmall" color="secondary">
                      •
                    </Text>
                    <Text variant="labelSmall" tabular color="secondary">
                      {`${item.setCount} ${item.setCount === 1 ? 'série' : 'séries'}`}
                    </Text>
                    {exercise.defaultRestS ? (
                      <>
                        <Text variant="labelSmall" color="secondary">
                          •
                        </Text>
                        <Text variant="labelSmall" tabular color="secondary">
                          {`${exercise.defaultRestS}s descanso`}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 6. DICAS / NOTAS DE EXECUÇÃO (ÍCONE NEUTRO #B7ADA3, SEM ÂMBAR) */}
        {tips.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleLeft}>
                <Lightbulb size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                <Text variant="bodyLarge" style={styles.sectionTitle}>
                  Dicas de execução
                </Text>
              </View>
            </View>

            <View style={styles.tipsList}>
              {tips.map((tip, idx) => (
                <View key={`tip-${idx}`} style={styles.tipCard}>
                  <View style={styles.tipIconBox}>
                    {idx === 0 ? (
                      <Dumbbell size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                    ) : idx === 1 ? (
                      <Sparkles size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                    ) : (
                      <Info size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                    )}
                  </View>
                  <View style={styles.tipContent}>
                    <Text variant="bodyMedium" style={styles.tipTitle}>
                      {tip.title}
                    </Text>
                    <Text variant="bodySmall" color="secondary" style={styles.tipText}>
                      {tip.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 7. BOTÃO FIXO INFERIOR */}
      <View
        style={[
          styles.floatingFooter,
          { paddingBottom: Math.max(spacing.md, insets.bottom + 8) },
        ]}
      >
        <Button
          title="Adicionar a um treino"
          icon={<Plus size={20} color={colors.onPrimary} strokeWidth={2.2} />}
          variant="primary"
          onPress={handleOpenAddToWorkout}
          style={styles.ctaButton}
        />
      </View>

      {/* Modal de opções do exercício */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuCard}>
            <Pressable
              onPress={handleOpenEdit}
              style={styles.menuItem}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Editar exercício"
            >
              <Pencil size={18} color={colors.onSurface} strokeWidth={1.75} />
              <Text variant="bodyMedium" style={styles.menuItemText}>
                Editar exercício
              </Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setMenuVisible(false);
                setArchiveModalVisible(true);
              }}
              style={styles.menuItem}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Arquivar exercício"
            >
              <Archive size={18} color={colors.error} strokeWidth={1.75} />
              <Text variant="bodyMedium" style={styles.menuItemDangerText}>
                Arquivar exercício
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ConfirmModal para arquivar */}
      <ConfirmModal
        visible={archiveModalVisible}
        title="Arquivar exercício?"
        description="O exercício sairá da biblioteca ativa. Seu histórico e recordes serão mantidos intactos."
        confirmLabel="Arquivar"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveModalVisible(false)}
      />

      {/* BottomSheet para selecionar treino */}
      <BottomSheet
        visible={bottomSheetVisible}
        onClose={() => setBottomSheetVisible(false)}
        title="Adicionar a um treino"
      >
        <View style={styles.sheetBody}>
          <Text variant="bodySmall" color="secondary" style={styles.sheetSubtitle}>
            Escolha em qual ficha deseja incluir este exercício com metas padrão (3 séries, 8 a 12 reps):
          </Text>

          {workouts.length > 0 ? (
            <View style={styles.workoutList}>
              {workouts.map((w) => (
                <Pressable
                  key={w.id}
                  onPress={() => handleSelectWorkout(w)}
                  style={styles.workoutItem}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar ao treino ${w.name}`}
                >
                  <View style={styles.workoutItemIcon}>
                    <Dumbbell size={18} color={colors.primary} strokeWidth={1.75} />
                  </View>
                  <View style={styles.workoutItemInfo}>
                    <Text variant="headline" style={styles.workoutItemName}>
                      {w.name}
                    </Text>
                    <Text variant="labelSmall" color="secondary">
                      {`${w.exerciseCount} ${w.exerciseCount === 1 ? 'exercício' : 'exercícios'}`}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWorkoutsSheet}>
              <Text variant="bodyMedium" color="secondary" style={styles.emptyWorkoutsText}>
                Nenhum treino ativo encontrado no momento.
              </Text>
              <Button
                title="+ Criar Treino A e adicionar"
                variant="primary"
                onPress={handleCreateAndAdd}
                style={styles.createWorkoutButton}
              />
            </View>
          )}
        </View>
      </BottomSheet>

      {/* Toast de confirmação */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #1A1715
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconButton: {
    width: spacing.touchTargetMin, // 48px
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.xs,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.margin,
  },
  notFoundButton: {
    marginTop: spacing.md,
  },

  // Identificação do exercício
  exerciseHeaderBlock: {
    marginBottom: spacing.lg,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  regionText: {
    color: colors.onSurfaceVariant,
    fontFamily: fontFamilies.dmSansMedium,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  exerciseName: {
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  primaryMuscleChip: {
    backgroundColor: colors.primaryContainer, // #3A251F
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  primaryMuscleChipText: {
    fontFamily: fontFamilies.dmSansMedium,
    fontWeight: '600',
    color: colors.primary, // #FF7A59
    fontSize: 12,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  infoPillText: {
    color: colors.onSurface,
    fontFamily: fontFamilies.dmSansMedium,
    fontWeight: '500',
    fontSize: 12,
  },
  infoPillTextMuted: {
    color: colors.onSurfaceVariant,
    fontFamily: fontFamilies.dmSansMedium,
    fontWeight: '500',
    fontSize: 12,
  },
  secondaryMusclesLine: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs + 2,
    color: colors.onSurfaceVariant,
  },

  // Seções gerais
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trophyIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.pr, // #FFC46B exclusivo para PR/troféu
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.onSurface,
    fontFamily: fontFamilies.outfitSemiBold,
    fontWeight: '600',
  },

  // Bento grid de recordes pessoais (2 colunas, 24px, flat tonal)
  bentoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainer, // #23201D
    borderRadius: radii.card, // 24px
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    padding: spacing.md,
    justifyContent: 'space-between',
    minHeight: 124,
  },
  recordHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  dumbbellPill: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  recordValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
  },
  recordNumber: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 32,
    lineHeight: 36,
    color: colors.onSurface,
  },
  recordNumberEmpty: {
    color: colors.onSurfaceVariant,
    lineHeight: 36,
    marginTop: 4,
    marginBottom: 8,
  },
  recordUnit: {
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  recordFooter: {
    marginTop: spacing.md,
  },
  recordReps: {
    color: colors.onSurface,
    fontWeight: '600',
    fontFamily: fontFamilies.outfitSemiBold,
  },
  emptyRecordsCard: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  emptyRecordsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
  },
  emptyNoticeText: {
    fontStyle: 'italic',
  },

  // Evolução de carga
  cycleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary, // #FF7A59
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  cycleBadgeText: {
    color: colors.onPrimary, // #1A1715
    fontFamily: fontFamilies.dmSansMedium,
    fontWeight: '700',
    fontSize: 11,
  },
  chartContainer: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card, // 24px
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  chartPeakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  chartPeakValue: {
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
  },
  periodChipsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  periodChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  periodChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodChipText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: fontFamilies.dmSansRegular,
    fontWeight: '500',
  },
  periodChipTextSelected: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.dmSansMedium,
    fontWeight: '700',
  },
  svgWrapper: {
    width: '100%',
    height: 130,
  },
  svgStyle: {
    width: '100%',
    height: '100%',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  xAxisLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: fontFamilies.outfitSemiBold,
  },
  xAxisLabelLast: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Histórico
  countBadge: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  countBadgeText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '500',
  },
  historyList: {
    gap: spacing.xs,
  },
  historyCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card, // 24px
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyDate: {
    color: colors.onSurface,
    fontFamily: fontFamilies.dmSansMedium,
    fontWeight: '600',
  },
  historyBestRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginVertical: 2,
  },
  historyBestSet: {
    color: colors.onSurface,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
  },
  historyBestLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },

  // Dicas de execução (ícones neutros #B7ADA3)
  tipsList: {
    gap: spacing.xs,
  },
  tipCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card, // 24px
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  tipIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    color: colors.onSurface,
    fontFamily: fontFamilies.dmSansMedium,
    fontWeight: '700',
  },
  tipText: {
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 18,
  },

  // Rodapé e botão flutuante
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  ctaButton: {
    width: '100%',
    minHeight: 52,
  },

  // Modal de opções (…)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.margin,
  },
  menuCard: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.card,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: spacing.touchTargetMin,
  },
  menuItemText: {
    color: colors.onSurface,
  },
  menuItemDangerText: {
    color: colors.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },

  // BottomSheet de adicionar ao treino
  sheetBody: {
    paddingHorizontal: spacing.margin,
    paddingBottom: spacing.lg,
  },
  sheetSubtitle: {
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  workoutList: {
    gap: spacing.xs,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: spacing.touchTargetMin,
  },
  workoutItemIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutItemInfo: {
    flex: 1,
  },
  workoutItemName: {
    color: colors.onSurface,
  },
  emptyWorkoutsSheet: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  emptyWorkoutsText: {
    textAlign: 'center',
  },
  createWorkoutButton: {
    minWidth: 220,
  },
});
