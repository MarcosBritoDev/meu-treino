import React, { useState, useMemo, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
  Edit2,
  Archive,
  ChevronRight,
  Zap,
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
import { colors, radii, spacing, typography } from '../theme';
import {
  ScreenHeader,
  Text,
  Chip,
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
} from '../domain/search';
import { formatarPeso } from '../domain/weight';
import { useSettingsStore } from '../store/useSettingsStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ExerciseDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ExerciseDetail'>>();
  const exerciseId = route.params?.exerciseId;

  const unit = useSettingsStore((state) => state.unit);

  // Estados locais
  const [period, setPeriod] = useState<'4 sem' | '3 meses' | 'tudo'>('4 sem');
  const [menuVisible, setMenuVisible] = useState(false);
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutOption[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Consulta dados do exercício
  const exercise = useMemo(() => {
    if (!exerciseId) return null;
    return getExerciseById(exerciseId);
  }, [exerciseId]);

  // Consulta recordes pessoais (Maior carga e Melhor volume)
  const records = useMemo(() => {
    if (!exerciseId) return { maxWeight: null, maxVolume: null };
    return getExerciseRecords(exerciseId);
  }, [exerciseId]);

  const hasRecords = Boolean(records.maxWeight && records.maxWeight.weight > 0);

  // Consulta pontos brutos de evolução para o gráfico
  const rawEvolutionPoints = useMemo(() => {
    if (!exerciseId || !hasRecords) return [];
    return getExerciseEvolutionPoints(exerciseId);
  }, [exerciseId, hasRecords]);

  // Estatísticas e pontos filtrados conforme período selecionado
  const evolutionStats = useMemo(() => {
    return filterEvolutionByPeriod(rawEvolutionPoints, period);
  }, [rawEvolutionPoints, period]);

  // Consulta histórico de sessões
  const sessionHistory = useMemo(() => {
    if (!exerciseId || !hasRecords) return [];
    return getExerciseSessionHistory(exerciseId, records.maxWeight?.weight);
  }, [exerciseId, hasRecords, records.maxWeight?.weight]);

  // Dicas de execução técnicas a partir das anotações
  const tips = useMemo(() => {
    return parseExecutionTips(exercise?.notes);
  }, [exercise?.notes]);

  // Região corporal derivada do músculo
  const bodyRegion = useMemo(() => {
    return deriveBodyRegion(exercise?.muscleGroup ?? '');
  }, [exercise?.muscleGroup]);

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

  // Renderização do gráfico SVG
  const renderEvolutionChart = () => {
    const points = evolutionStats.points;
    if (points.length === 0) return null;

    const weights = points.map((p) => p.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const diff = maxW - minW;

    // Se todos os pontos forem iguais, adiciona folga visual
    const yMax = diff === 0 ? maxW + 2 : maxW + diff * 0.15;
    const yMin = diff === 0 ? Math.max(0, minW - 2) : Math.max(0, minW - diff * 0.15);
    const yRange = yMax - yMin || 1;

    // Dimensões do gráfico viewBox: 0 0 340 130
    const startX = 45;
    const endX = 315;
    const topY = 20;
    const bottomY = 110;
    const chartWidth = endX - startX;
    const chartHeight = bottomY - topY;

    // Mapeamento dos pontos (x, y)
    const coords = points.map((p, idx) => {
      const x = points.length === 1
        ? (startX + endX) / 2
        : startX + (idx / (points.length - 1)) * chartWidth;
      const normalizedY = (p.weight - yMin) / yRange;
      const y = bottomY - normalizedY * chartHeight;
      return { x, y, weight: p.weight, date: p.date };
    });

    // Caminho da linha
    const linePath = coords.reduce(
      (acc, c, idx) => (idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`),
      ''
    );

    // Caminho da área preenchida
    const areaPath = coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${bottomY + 5} L ${coords[0].x} ${bottomY + 5} Z`
      : '';

    // Linhas horizontais de grade
    const midWeight = (yMax + yMin) / 2;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeaderRow}>
          <View style={styles.chartPeakRow}>
            <Text variant="labelSmall" color="secondary">
              Pico atual:
            </Text>
            <Text variant="bodyLarge" style={styles.chartPeakValue}>
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

        {/* Gráfico SVG */}
        <View style={styles.svgWrapper}>
          <Svg viewBox="0 0 340 130" style={styles.svgStyle}>
            <Defs>
              <LinearGradient id="evolutionGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.35" />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Linhas de grade e valores no eixo Y */}
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
              fontFamily="DM Sans"
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
              fontFamily="DM Sans"
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
              fontFamily="DM Sans"
            >
              {formatarPeso(yMin, unit)}
            </SvgText>

            {/* Área preenchida */}
            {areaPath ? <Path d={areaPath} fill="url(#evolutionGrad)" /> : null}

            {/* Linha principal de evolução */}
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
                      r={11}
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

        {/* Eixo X com datas curtas */}
        <View style={styles.xAxisRow}>
          {coords.map((c, idx) => {
            const isLast = idx === coords.length - 1;
            return (
              <Text
                key={`label-${idx}`}
                variant="labelSmall"
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
      {/* Cabeçalho superior: título com o nome do exercício e menu à direita */}
      <ScreenHeader
        title={exercise.name}
        onBack={() => navigation.goBack()}
        rightAction={
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setMenuVisible(true);
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Opções do exercício"
            style={styles.menuButton}
          >
            <MoreVertical size={22} color={colors.onSurfaceVariant} strokeWidth={1.75} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bloco de identificação do exercício */}
        <View style={styles.exerciseHeaderBlock}>
          <View style={styles.regionRow}>
            <Dumbbell size={16} color={colors.pr} strokeWidth={1.75} />
            <Text variant="labelSmall" style={styles.regionText}>
              {bodyRegion}
            </Text>
          </View>

          <Text variant="displayMedium" style={styles.exerciseName}>
            {exercise.name}
          </Text>

          {/* Chips informativos */}
          <View style={styles.chipsRow}>
            <View style={styles.infoPill}>
              <Text variant="labelSmall" style={styles.infoPillText}>
                {exercise.muscleGroup}
              </Text>
            </View>
            <View style={styles.infoPill}>
              <Text variant="labelSmall" style={styles.infoPillText}>
                {exercise.equipment}
              </Text>
            </View>
            <View style={styles.infoPill}>
              <Text variant="labelSmall" style={styles.infoPillTextMuted}>
                {exercise.kind === 'composto' ? 'Composto' : 'Isolamento'}
              </Text>
            </View>
          </View>
        </View>

        {/* Seção 1: Recordes pessoais (Bento Pair) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.trophyIconBox}>
                <Trophy size={15} color={colors.background} strokeWidth={1.75} />
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
                <View style={styles.bentoWatermark}>
                  <Trophy size={56} color={colors.surfaceContainerHighest} strokeWidth={1.5} opacity={0.4} />
                </View>
                <View>
                  <Text variant="labelSmall" color="secondary">
                    Maior carga
                  </Text>
                  <View style={styles.recordValueRow}>
                    <Text variant="displayLarge" style={styles.recordNumber}>
                      {records.maxWeight?.weight ?? '—'}
                    </Text>
                    <Text variant="bodyLarge" style={styles.recordUnit}>
                      {unit}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordFooter}>
                  <Text variant="labelSmall" style={styles.recordReps}>
                    {records.maxWeight ? `× ${records.maxWeight.reps} reps` : '—'}
                  </Text>
                  <Text variant="labelSmall" color="secondary">
                    {formatPtBrDateMedium(records.maxWeight?.completedAt ?? null)}
                  </Text>
                </View>
              </View>

              {/* Card 2: Melhor volume */}
              <View style={styles.bentoCard}>
                <View style={styles.bentoWatermark}>
                  <Zap size={56} color={colors.surfaceContainerHighest} strokeWidth={1.5} opacity={0.4} />
                </View>
                <View>
                  <Text variant="labelSmall" color="secondary">
                    Melhor volume
                  </Text>
                  <View style={styles.recordValueRow}>
                    <Text variant="displayLarge" style={styles.recordNumber}>
                      {records.maxVolume ? Math.round(records.maxVolume.volume) : '—'}
                    </Text>
                    <Text variant="bodyLarge" style={styles.recordUnit}>
                      {unit}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordFooter}>
                  <Text variant="labelSmall" style={styles.recordReps}>
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
                  <Text variant="displayLarge" style={styles.recordNumberEmpty}>
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
                  <Text variant="displayLarge" style={styles.recordNumberEmpty}>
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

        {/* Seção 2: Evolução de carga (só aparece quando houver histórico) */}
        {hasRecords && (
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
                <TrendingUp size={12} color={colors.background} strokeWidth={2} />
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

        {/* Seção 3: Histórico de sessões (só aparece quando houver histórico) */}
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
                      <PRBadge label="Recorde atual" />
                    ) : (
                      <Text variant="labelSmall" color="secondary">
                        Sessão regular
                      </Text>
                    )}
                  </View>

                  <View style={styles.historyBestRow}>
                    <Text variant="headline" style={styles.historyBestSet}>
                      {`${formatarPeso(item.bestWeight, unit)} × ${item.bestReps}`}
                    </Text>
                    <Text variant="labelSmall" color="secondary" style={styles.historyBestLabel}>
                      melhor série
                    </Text>
                  </View>

                  <View style={styles.historyMetaRow}>
                    <Text variant="labelSmall" color="secondary">
                      {`vol. ${formatarPeso(item.totalVolume, unit)}`}
                    </Text>
                    <Text variant="labelSmall" color="secondary">
                      •
                    </Text>
                    {item.avgRpe ? (
                      <>
                        <Text variant="labelSmall" color="secondary">
                          {`RPE ${item.avgRpe}`}
                        </Text>
                        <Text variant="labelSmall" color="secondary">
                          •
                        </Text>
                      </>
                    ) : null}
                    <Text variant="labelSmall" color="secondary">
                      {`${item.setCount} ${item.setCount === 1 ? 'série' : 'séries'}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Seção 4: Dicas de execução (oculta se notas forem vazias) */}
        {tips.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleLeft}>
                <Lightbulb size={18} color={colors.pr} strokeWidth={1.75} />
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
                      <Dumbbell size={18} color={colors.pr} strokeWidth={1.75} />
                    ) : idx === 1 ? (
                      <Sparkles size={18} color={colors.pr} strokeWidth={1.75} />
                    ) : (
                      <Info size={18} color={colors.pr} strokeWidth={1.75} />
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

        {/* Espaço extra para o botão flutuante inferior */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Botão primário fixo embaixo: Adicionar a um treino */}
      <View style={styles.floatingFooter}>
        <Button
          title="Adicionar a um treino"
          icon={<Plus size={20} color={colors.onPrimary} strokeWidth={2.2} />}
          variant="primary"
          onPress={handleOpenAddToWorkout}
          style={styles.ctaButton}
        />
      </View>

      {/* Modal de opções (…) */}
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
              onPress={() => {
                triggerHaptic('light');
                setMenuVisible(false);
                navigation.navigate('NewExercise', {
                  exerciseId: exercise.id,
                  initialName: exercise.name,
                });
              }}
              style={styles.menuItem}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Editar exercício"
            >
              <Edit2 size={18} color={colors.onSurface} strokeWidth={1.75} />
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  menuButton: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.pr,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  exerciseName: {
    color: colors.onSurface,
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  infoPill: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  infoPillText: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  infoPillTextMuted: {
    color: colors.onSurfaceVariant,
    fontWeight: '500',
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
    backgroundColor: colors.pr,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.onSurface,
    fontWeight: '600',
  },

  // Bento grid de recordes
  bentoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    padding: spacing.md,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 124,
  },
  bentoWatermark: {
    position: 'absolute',
    right: -4,
    bottom: -4,
  },
  recordValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  recordNumber: {
    color: colors.onSurface,
    lineHeight: 36,
  },
  recordNumberEmpty: {
    color: colors.onSurfaceVariant,
    lineHeight: 36,
    marginTop: 4,
    marginBottom: 8,
  },
  recordUnit: {
    color: colors.pr,
    fontWeight: '600',
  },
  recordFooter: {
    marginTop: spacing.md,
  },
  recordReps: {
    color: colors.onSurface,
    fontWeight: '600',
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  cycleBadgeText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 11,
  },
  chartContainer: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
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
  },
  periodChipSelected: {
    backgroundColor: colors.primary,
  },
  periodChipText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '500',
  },
  periodChipTextSelected: {
    color: colors.background,
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
  },
  xAxisLabelLast: {
    color: colors.pr,
    fontWeight: '700',
  },

  // Histórico
  countBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.xs,
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
    borderRadius: radii.card,
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
    fontWeight: '600',
  },
  historyBestRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginVertical: 2,
  },
  historyBestSet: {
    color: colors.pr,
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

  // Dicas de execução
  tipsList: {
    gap: spacing.xs,
  },
  tipCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
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
    fontWeight: '700',
  },
  tipText: {
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 18,
  },

  // Rodapé e botão flutuante
  bottomSpacer: {
    height: 80,
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.margin,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  ctaButton: {
    width: '100%',
  },

  // Modal de opções (…)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
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
