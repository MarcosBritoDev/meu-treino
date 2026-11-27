import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Flame, Trash2 } from 'lucide-react-native';
import { triggerHaptic } from './haptics';
import { StyledDropdown, StyledDropdownOption } from './StyledDropdown';
import {
  Unit,
  RepsMode,
  EffortMode,
  SetType,
  RPE_OPTIONS,
  RIR_OPTIONS,
  formatDecimalBR,
  kgToDisplay,
  displayToKg,
  formatWeight,
  suggest1RmWeightKg,
  sanitizePlannedSet,
  canSetBeDrop,
  DROP_PERCENT_PRESETS,
} from '../domain/sessionMath';
import { colors, fontFamilies, radii, spacing } from '../theme';

export { DROP_PERCENT_PRESETS };

export const SET_REST_OPTIONS: readonly (number | null)[] = [
  null,
  0,
  30,
  60,
  90,
  120,
  180,
];

export const REPS_MODE_DROPDOWN_OPTIONS: StyledDropdownOption[] = [
  { value: 'reps', label: 'Repetições' },
  { value: 'reps_range', label: 'Faixa de repetições' },
  { value: 'reps_max', label: 'Máximo de repetições' },
  { value: 'amrap', label: 'AMRAP (máximo de reps)' },
  { value: 'time', label: 'Tempo (segundos)' },
  { value: 'time_range', label: 'Faixa de tempo' },
];

export function getTypeLabel(type?: string): string {
  switch (type) {
    case 'warmup':
      return 'Aquecimento';
    case 'normal':
      return 'Normal';
    case 'failure':
      return 'Falha';
    case 'drop':
      return 'Drop';
    default:
      return 'Normal';
  }
}

export function formatRestShort(seconds?: number | null): string {
  if (seconds === null || seconds === undefined) return 'Herdar';
  if (seconds === 0) return '0s';
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds}s`;
}

export const getEffortModeOptions = (unit: Unit): StyledDropdownOption[] => [
  { value: 'none', label: 'Nenhum' },
  { value: 'rpe', label: 'RPE' },
  { value: 'rpe_range', label: 'Faixa de RPE' },
  { value: 'rir', label: 'RIR' },
  { value: 'percent_1rm', label: '% de 1RM' },
  { value: 'percent_1rm_exercise', label: '% de 1RM de outro exercício' },
  { value: 'last_week_plus', label: `Semana passada + X ${unit}` },
  { value: 'last_session_plus', label: `Sessão passada + X ${unit}` },
];

export interface CatalogExerciseItem {
  id: string;
  name: string;
  oneRmKg?: number | null;
}

const DEFAULT_CATALOG: CatalogExerciseItem[] = [
  { id: 'ex-1', name: 'Supino Reto (Barra)', oneRmKg: 100 },
  { id: 'ex-2', name: 'Agachamento Livre (Barra)', oneRmKg: 140 },
  { id: 'ex-3', name: 'Levantamento Terra (Barra)', oneRmKg: 160 },
  { id: 'ex-4', name: 'Desenvolvimento (Barra)', oneRmKg: 65 },
];

export interface SetEditSheetProps {
  visible: boolean;
  set: Record<string, any> | null;
  sets?: Array<{ type?: SetType | string; isWarmup?: boolean }>;
  setIndex?: number;
  exercise?: {
    id?: string;
    name?: string;
    oneRmKg?: number | null;
    defaultMinReps?: number | null;
    defaultMaxReps?: number | null;
    defaultRest?: number | null;
  } | null;
  badgeLabel: string;
  unit?: Unit;
  catalog?: CatalogExerciseItem[];
  onClose: () => void;
  onApply: (updatedSet: any) => void;
  onRemove: (setId: string) => void;
}

export const SetEditSheet: React.FC<SetEditSheetProps> = ({
  visible,
  set,
  sets,
  setIndex,
  exercise,
  badgeLabel,
  unit = 'kg',
  catalog = DEFAULT_CATALOG,
  onClose,
  onApply,
  onRemove,
}) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<SetType>('normal');
  const [repsMode, setRepsMode] = useState<RepsMode>('reps_range');
  const [minVal, setMinVal] = useState<number>(8);
  const [maxVal, setMaxVal] = useState<number>(10);

  const [effortMode, setEffortMode] = useState<EffortMode>('none');
  const [effortVal, setEffortVal] = useState<number>(8);
  const [effortValMax, setEffortValMax] = useState<number>(9);
  const [effortRefExId, setEffortRefExId] = useState<string>(catalog[0]?.id || 'ex-1');
  const [incrementInput, setIncrementInput] = useState<string>('2,5');
  const [isIncrementFocused, setIsIncrementFocused] = useState<boolean>(false);

  const [dropPercent, setDropPercent] = useState<number>(20);
  const [dropPercentInput, setDropPercentInput] = useState<string>('20');
  const [isDropFocused, setIsDropFocused] = useState<boolean>(false);

  const [rest, setRest] = useState<number | null>(null);

  // Intervalo para suporte a toque contínuo (press-and-hold) nos steppers
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const startHoldAction = (action: () => void) => {
    clearHoldTimer();
    action();
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = setInterval(() => {
        action();
      }, 100);
    }, 350);
  };

  useEffect(() => {
    return () => {
      clearHoldTimer();
    };
  }, []);

  const effectiveIndex =
    setIndex !== undefined
      ? setIndex
      : sets && set
      ? sets.findIndex((s: any) => s.id === set.id)
      : -1;
  const canDrop = sets && effectiveIndex >= 0 ? canSetBeDrop(sets, effectiveIndex) : true;

  useEffect(() => {
    if (set && visible) {
      const currentType = (set.type ||
        (set.isWarmup ? 'warmup' : set.isFailure ? 'failure' : 'normal')) as SetType;
      setType(currentType);

      const rMode = (set.repsMode || set.reps_mode || 'reps_range') as RepsMode;
      setRepsMode(rMode);

      const rawMin = set.minReps ?? set.min_reps;
      const rawMax = set.maxReps ?? set.max_reps;
      const isTime = rMode.startsWith('time');
      setMinVal(rawMin ?? (isTime ? 30 : 8));
      setMaxVal(rawMax ?? (rMode === 'reps_max' ? (rawMin ?? 10) : isTime ? 45 : 10));

      const rawEffortMode = (set.effortMode || set.effort_mode || 'none') as EffortMode;
      const eMode = currentType === 'normal' ? rawEffortMode : 'none';
      setEffortMode(eMode);

      const rawVal = set.effortValue ?? set.effort_value;
      const rawValMax = set.effortValueMax ?? set.effort_value_max;
      setEffortVal(
        rawVal ?? (eMode === 'rir' ? 2 : eMode.includes('1rm') ? 75 : 8)
      );
      setEffortValMax(rawValMax ?? 8.5);

      const rawRefEx = set.effortRefExerciseId ?? set.effort_ref_exercise_id;
      setEffortRefExId(rawRefEx || catalog[0]?.id || 'ex-1');

      if (eMode === 'last_week_plus' || eMode === 'last_session_plus') {
        const valInKg = rawVal ?? 2.5;
        const disp = kgToDisplay(valInKg, unit);
        setIncrementInput(formatDecimalBR(disp));
      } else {
        const disp = kgToDisplay(2.5, unit);
        setIncrementInput(formatDecimalBR(disp));
      }

      const rawDrop = set.drop_percent ?? set.dropPercent;
      const initialDrop =
        rawDrop !== null && rawDrop !== undefined && !Number.isNaN(Number(rawDrop))
          ? Math.min(90, Math.max(1, Number(rawDrop)))
          : 20;
      setDropPercent(initialDrop);
      setDropPercentInput(String(initialDrop));

      const rawRest = set.rest ?? set.rest_s ?? null;
      setRest(rawRest);
    }
  }, [set, visible, unit, catalog]);

  if (!visible || !set) return null;

  const isFailureLike = type === 'failure' || type === 'drop';
  const isTimeMode = repsMode === 'time' || repsMode === 'time_range';
  const stepAmount = isTimeMode ? 5 : 1;

  const refExercise = catalog.find((e) => e.id === effortRefExId);
  const estimated1RmKg =
    effortMode === 'percent_1rm'
      ? suggest1RmWeightKg(exercise?.oneRmKg ?? 100, effortVal)
      : effortMode === 'percent_1rm_exercise'
      ? suggest1RmWeightKg(refExercise?.oneRmKg ?? 100, effortVal)
      : null;

  const handleTypeChange = (newType: SetType) => {
    triggerHaptic('selection');
    setType(newType);
    if (newType === 'warmup') {
      setEffortMode('none');
      setRepsMode('reps_range');
      setMinVal(8);
      setMaxVal(12);
    } else if (newType === 'failure' || newType === 'drop') {
      setEffortMode('none');
      if (newType === 'drop') {
        setDropPercent((prev) => prev || 20);
        setDropPercentInput((prev) => prev || '20');
      }
    }
  };

  const handleDropPercentInputChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    setDropPercentInput(clean);
    if (clean !== '') {
      const parsed = parseInt(clean, 10);
      if (!Number.isNaN(parsed)) {
        if (parsed > 90) {
          setDropPercent(90);
        } else if (parsed < 1) {
          setDropPercent(1);
        } else {
          setDropPercent(parsed);
        }
      }
    }
  };

  const handleDropPercentInputBlur = () => {
    setIsDropFocused(false);
    if (!dropPercentInput || parseInt(dropPercentInput, 10) < 1) {
      setDropPercent(20);
      setDropPercentInput('20');
    } else if (parseInt(dropPercentInput, 10) > 90) {
      setDropPercent(90);
      setDropPercentInput('90');
    } else {
      setDropPercentInput(String(dropPercent));
    }
  };

  const handleIncrementBlur = () => {
    setIsIncrementFocused(false);
    const parsed = parseFloat(incrementInput.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed < 0) {
      setIncrementInput(formatDecimalBR(kgToDisplay(2.5, unit)));
    }
  };

  const handleRepsModeChange = (newModeVal: string) => {
    triggerHaptic('selection');
    const newMode = newModeVal as RepsMode;
    setRepsMode(newMode);
    if (newMode === 'time') {
      setMinVal(45);
      setMaxVal(45);
    } else if (newMode === 'time_range') {
      setMinVal(30);
      setMaxVal(45);
    } else if (newMode === 'reps') {
      setMinVal(10);
      setMaxVal(10);
    } else if (newMode === 'reps_range') {
      setMinVal(8);
      setMaxVal(10);
    } else if (newMode === 'reps_max') {
      setMaxVal((prev) => (prev && prev > 0 ? prev : 10));
    }
  };

  const handleEffortModeChange = (newModeVal: string) => {
    triggerHaptic('selection');
    const newMode = newModeVal as EffortMode;
    setEffortMode(newMode);
    if (newMode === 'rpe') {
      setEffortVal(8);
    } else if (newMode === 'rpe_range') {
      setEffortVal(7);
      setEffortValMax(8);
    } else if (newMode === 'rir') {
      setEffortVal(2);
    } else if (newMode === 'percent_1rm') {
      setEffortVal(75);
    } else if (newMode === 'percent_1rm_exercise') {
      setEffortVal(66);
    } else if (newMode === 'last_week_plus' || newMode === 'last_session_plus') {
      const disp = kgToDisplay(2.5, unit);
      setIncrementInput(formatDecimalBR(disp));
    }
  };

  const handleSave = () => {
    triggerHaptic('light');
    const hideReps = isFailureLike || repsMode === 'amrap';
    const isSingleVal = repsMode === 'reps' || repsMode === 'time';
    const isMaxReps = repsMode === 'reps_max';

    const cleanMin = hideReps || isMaxReps ? null : minVal;
    const cleanMax = hideReps ? null : isMaxReps ? maxVal : isSingleVal ? minVal : Math.max(minVal, maxVal);
    const cleanEffortMode = type === 'normal' ? effortMode : 'none';

    let cleanEffortVal: number | null = null;
    let cleanEffortMax: number | null = null;
    let cleanRefEx: string | null = null;

    if (
      cleanEffortMode === 'rpe' ||
      cleanEffortMode === 'rir' ||
      cleanEffortMode === 'percent_1rm'
    ) {
      cleanEffortVal = effortVal;
    } else if (cleanEffortMode === 'rpe_range') {
      cleanEffortVal = effortVal;
      cleanEffortMax = Math.max(effortVal, effortValMax);
    } else if (cleanEffortMode === 'percent_1rm_exercise') {
      cleanEffortVal = effortVal;
      cleanRefEx = effortRefExId;
    } else if (
      cleanEffortMode === 'last_week_plus' ||
      cleanEffortMode === 'last_session_plus'
    ) {
      const parsedDisplay = parseFloat(incrementInput.replace(',', '.'));
      cleanEffortVal =
        Number.isNaN(parsedDisplay) || parsedDisplay < 0
          ? 2.5
          : displayToKg(parsedDisplay, unit);
    }

    const finalDropPercent =
      type === 'drop' ? Math.min(90, Math.max(1, dropPercent || 20)) : null;

    const payload = sanitizePlannedSet({
      ...set,
      type,
      repsMode: isFailureLike ? 'reps_max' : repsMode,
      reps_mode: isFailureLike ? 'reps_max' : repsMode,
      minReps: cleanMin,
      min_reps: cleanMin,
      maxReps: cleanMax,
      max_reps: cleanMax,
      effortMode: cleanEffortMode,
      effort_mode: cleanEffortMode,
      effortValue: cleanEffortVal,
      effort_value: cleanEffortVal,
      effortValueMax: cleanEffortMax,
      effort_value_max: cleanEffortMax,
      effortRefExerciseId: cleanRefEx,
      effort_ref_exercise_id: cleanRefEx,
      rest,
      rest_s: rest,
      isWarmup: type === 'warmup',
      isFailure: type === 'failure',
      drop_percent: finalDropPercent,
      dropPercent: finalDropPercent,
    });

    onApply(payload);
    onClose();
  };

  // Proteção contra exclusão acidental via Alert.alert nativo
  const handleRemove = () => {
    triggerHaptic('medium');
    Alert.alert(
      'Remover série?',
      `Tem certeza que deseja remover a série ${badgeLabel}? Esta ação não pode ser desfeita.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('medium');
            onRemove(set.id);
            onClose();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const effortDropdownOptions = getEffortModeOptions(unit);

  const catalogDropdownOptions: StyledDropdownOption[] = catalog.map((e) => ({
    value: e.id,
    label: `${e.name} (1RM: ${formatWeight(e.oneRmKg ?? 100, unit)} ${unit})`,
  }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={styles.overlay}>
          {/* Fundo preto 65% que fecha ao toque com acessibilidade correta */}
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar painel"
          />

          <View
            style={[
              styles.sheetContainer,
              {
                maxHeight: height * 0.85,
                paddingBottom: Math.max(spacing.lg, insets.bottom + 12),
              },
            ]}
          >
            {/* Alça central de arrasto */}
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>

            {/* Cabeçalho */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                Série {badgeLabel} · {getTypeLabel(type)}
              </Text>
              <Pressable
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. Tipo de série */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Tipo de série</Text>
                <View style={styles.chipsRow}>
                  {(['warmup', 'normal', 'failure', 'drop'] as const).map((t) => {
                    const isSelected = type === t;
                    const isDropDisabled = t === 'drop' && !canDrop;
                    return (
                      <Pressable
                        key={t}
                        disabled={isDropDisabled}
                        onPress={() => !isDropDisabled && handleTypeChange(t)}
                        style={[
                          styles.chipBtn,
                          isSelected ? styles.chipBtnSelected : styles.chipBtnUnselected,
                          isDropDisabled && styles.chipBtnDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected, disabled: isDropDisabled }}
                        accessibilityLabel={getTypeLabel(t)}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Text
                          style={[
                            styles.chipBtnText,
                            isSelected
                              ? styles.chipBtnTextSelected
                              : styles.chipBtnTextUnselected,
                            isDropDisabled && styles.chipBtnTextDisabled,
                          ]}
                        >
                          {getTypeLabel(t)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!canDrop && (
                  <Text style={styles.discreetNoticeText}>
                    Drop exige uma série de trabalho antes dele
                  </Text>
                )}
              </View>

              {/* 2. Meta de Reps / Tempo */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Meta de repetições / tempo</Text>

                {isFailureLike ? (
                  <View style={styles.failureNotice}>
                    <Flame size={18} color={colors.primary} />
                    <Text style={styles.failureNoticeText}>
                      Até a falha (faixa desabilitada para {getTypeLabel(type)})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.controlsGroup}>
                    <StyledDropdown
                      value={repsMode}
                      options={REPS_MODE_DROPDOWN_OPTIONS}
                      onChange={handleRepsModeChange}
                      placeholder="Selecione o tipo de meta"
                    />

                    {/* 1 Stepper Circular 48x48 (Repetições, Tempo ou Máximo de Reps) */}
                    {(repsMode === 'reps' || repsMode === 'time' || repsMode === 'reps_max') && (
                      <View style={styles.stepperCard}>
                        <Text style={styles.stepperLabel}>
                          {isTimeMode
                            ? 'Duração alvo (segundos)'
                            : repsMode === 'reps_max'
                            ? 'Máximo de repetições'
                            : 'Repetições alvo'}
                        </Text>
                        <View style={styles.stepperControls}>
                          <Pressable
                            onPressIn={() =>
                              startHoldAction(() => {
                                triggerHaptic('selection');
                                if (repsMode === 'reps_max') {
                                  setMaxVal((prev) => Math.max(1, prev - 1));
                                } else {
                                  setMinVal((prev) => Math.max(stepAmount, prev - stepAmount));
                                }
                              })
                            }
                            onPressOut={clearHoldTimer}
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Diminuir"
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Text style={styles.stepperBtnText}>−</Text>
                          </Pressable>
                          <Text style={styles.stepperValue}>
                            {repsMode === 'reps_max' ? maxVal : minVal}
                            {isTimeMode ? 's' : ''}
                          </Text>
                          <Pressable
                            onPressIn={() =>
                              startHoldAction(() => {
                                triggerHaptic('selection');
                                if (repsMode === 'reps_max') {
                                  setMaxVal((prev) => prev + 1);
                                } else {
                                  setMinVal((prev) => prev + stepAmount);
                                }
                              })
                            }
                            onPressOut={clearHoldTimer}
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Aumentar"
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Text style={styles.stepperBtnText}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {/* 2 Steppers em Grade (Faixa de Repetições ou Faixa de Tempo) */}
                    {(repsMode === 'reps_range' || repsMode === 'time_range') && (
                      <View style={styles.stepperGrid}>
                        <View style={styles.stepperGridCard}>
                          <Text style={styles.stepperGridLabel}>Mínimo</Text>
                          <View style={styles.stepperGridControls}>
                            <Pressable
                              onPressIn={() =>
                                startHoldAction(() => {
                                  triggerHaptic('selection');
                                  setMinVal((prev) => Math.max(stepAmount, prev - stepAmount));
                                })
                              }
                              onPressOut={clearHoldTimer}
                              style={styles.stepperGridBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Diminuir mínimo"
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={styles.stepperBtnText}>−</Text>
                            </Pressable>
                            <Text style={styles.stepperValueCompact}>
                              {minVal}
                              {isTimeMode ? 's' : ''}
                            </Text>
                            <Pressable
                              onPressIn={() =>
                                startHoldAction(() => {
                                  triggerHaptic('selection');
                                  setMinVal((prev) => {
                                    const next = prev + stepAmount;
                                    setMaxVal((currMax) => (next > currMax ? next : currMax));
                                    return next;
                                  });
                                })
                              }
                              onPressOut={clearHoldTimer}
                              style={styles.stepperGridBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Aumentar mínimo"
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={styles.stepperBtnText}>+</Text>
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.stepperGridCard}>
                          <Text style={styles.stepperGridLabel}>Máximo</Text>
                          <View style={styles.stepperGridControls}>
                            <Pressable
                              onPressIn={() =>
                                startHoldAction(() => {
                                  triggerHaptic('selection');
                                  setMaxVal((prev) => Math.max(minVal, prev - stepAmount));
                                })
                              }
                              onPressOut={clearHoldTimer}
                              style={styles.stepperGridBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Diminuir máximo"
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={styles.stepperBtnText}>−</Text>
                            </Pressable>
                            <Text style={styles.stepperValueCompact}>
                              {maxVal}
                              {isTimeMode ? 's' : ''}
                            </Text>
                            <Pressable
                              onPressIn={() =>
                                startHoldAction(() => {
                                  triggerHaptic('selection');
                                  setMaxVal((prev) => prev + stepAmount);
                                })
                              }
                              onPressOut={clearHoldTimer}
                              style={styles.stepperGridBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Aumentar máximo"
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={styles.stepperBtnText}>+</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* 3. Meta de Esforço / Referência (Apenas série Normal) */}
              {type === 'normal' && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Meta de esforço</Text>

                  <View style={styles.controlsGroup}>
                    <StyledDropdown
                      value={effortMode}
                      options={effortDropdownOptions}
                      onChange={handleEffortModeChange}
                      placeholder="Selecione o esforço ou referência"
                    />

                    {/* RPE único */}
                    {effortMode === 'rpe' && (
                      <View style={styles.wrapRow}>
                        {RPE_OPTIONS.map((val) => {
                          const isSelected = effortVal === val;
                          return (
                            <Pressable
                              key={val}
                              onPress={() => {
                                triggerHaptic('selection');
                                setEffortVal(val);
                              }}
                              style={[
                                styles.smallChip,
                                isSelected
                                  ? styles.smallChipSelected
                                  : styles.smallChipUnselected,
                              ]}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              accessibilityLabel={`RPE ${formatDecimalBR(val)}`}
                              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            >
                              <Text
                                style={[
                                  styles.smallChipText,
                                  isSelected
                                    ? styles.smallChipTextSelected
                                    : styles.smallChipTextUnselected,
                                ]}
                              >
                                {formatDecimalBR(val)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    {/* Faixa de RPE (2 Steppers) */}
                    {effortMode === 'rpe_range' && (
                      <View style={styles.stepperGrid}>
                        <View style={styles.stepperGridCard}>
                          <Text style={styles.stepperGridLabel}>RPE mínimo</Text>
                          <View style={styles.stepperGridControls}>
                            <Pressable
                              onPressIn={() =>
                                startHoldAction(() => {
                                  triggerHaptic('selection');
                                  setEffortVal((prev) =>
                                    Math.max(6, Number((prev - 0.5).toFixed(1)))
                                  );
                                })
                              }
                              onPressOut={clearHoldTimer}
                              style={styles.stepperGridBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Diminuir RPE mínimo"
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={styles.stepperBtnText}>−</Text>
                            </Pressable>
                            <Text style={styles.stepperValueCompact}>
                              {formatDecimalBR(effortVal)}
                            </Text>
                            <Pressable
                              onPressIn={() =>
                                startHoldAction(() => {
                                  triggerHaptic('selection');
                                  setEffortVal((prev) => {
                                    const next = Math.min(10, Number((prev + 0.5).toFixed(1)));
                                    setEffortValMax((currMax) => (next > currMax ? next : currMax));
                                    return next;
                                  });
                                })
                              }
                              onPressOut={clearHoldTimer}
                              style={styles.stepperGridBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Aumentar RPE mínimo"
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={styles.stepperBtnText}>+</Text>
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.stepperGridCard}>
                          <Text style={styles.stepperGridLabel}>RPE máximo</Text>
                          <View style={styles.stepperGridControls}>
                            <Pressable
                              onPressIn={() =>
                                startHoldAction(() => {
                                  triggerHaptic('selection');
                                  setEffortValMax((prev) =>
                                    Math.max(effortVal, Number((prev - 0.5).toFixed(1)))
                                  );
                                })
                              }
                              onPressOut={clearHoldTimer}
                              style={styles.stepperGridBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Diminuir RPE máximo"
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={styles.stepperBtnText}>−</Text>
                            </Pressable>
                            <Text style={styles.stepperValueCompact}>
                              {formatDecimalBR(effortValMax)}
                            </Text>
                            <Pressable
                              onPressIn={() =>
                                startHoldAction(() => {
                                  triggerHaptic('selection');
                                  setEffortValMax((prev) =>
                                    Math.min(10, Number((prev + 0.5).toFixed(1)))
                                  );
                                })
                              }
                              onPressOut={clearHoldTimer}
                              style={styles.stepperGridBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Aumentar RPE máximo"
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={styles.stepperBtnText}>+</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* RIR */}
                    {effortMode === 'rir' && (
                      <View style={styles.wrapRow}>
                        {RIR_OPTIONS.map((val) => {
                          const isSelected = effortVal === val;
                          return (
                            <Pressable
                              key={val}
                              onPress={() => {
                                triggerHaptic('selection');
                                setEffortVal(val);
                              }}
                              style={[
                                styles.smallChip,
                                isSelected
                                  ? styles.smallChipSelected
                                  : styles.smallChipUnselected,
                              ]}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              accessibilityLabel={`${val} RIR`}
                              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            >
                              <Text
                                style={[
                                  styles.smallChipText,
                                  isSelected
                                    ? styles.smallChipTextSelected
                                    : styles.smallChipTextUnselected,
                                ]}
                              >
                                {val} RIR
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    {/* % de 1RM */}
                    {(effortMode === 'percent_1rm' ||
                      effortMode === 'percent_1rm_exercise') && (
                      <View style={styles.controlsGroup}>
                        {effortMode === 'percent_1rm_exercise' && (
                          <StyledDropdown
                            value={effortRefExId}
                            options={catalogDropdownOptions}
                            onChange={(newRefId) => setEffortRefExId(newRefId)}
                            placeholder="Escolha o exercício de referência"
                          />
                        )}

                        <View style={styles.stepperCard}>
                          <View style={styles.stepperTextWrap}>
                            <Text style={styles.stepperLabel}>Porcentagem do 1RM</Text>
                            {estimated1RmKg !== null && (
                              <Text style={styles.stepperSubtext}>
                                Estimativa no treino: ~{formatWeight(estimated1RmKg, unit)} {unit}
                              </Text>
                            )}
                          </View>
                          <View style={styles.stepperControls}>
                            <Pressable
                              onPressIn={() =>
                                startHoldAction(() => {
                                  triggerHaptic('selection');
                                  setEffortVal((prev) => Math.max(30, prev - 2.5));
                                })
                              }
                              onPressOut={clearHoldTimer}
                              style={styles.stepperBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Diminuir porcentagem"
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={styles.stepperBtnText}>−</Text>
                            </Pressable>
                            <Text style={styles.stepperValuePercent}>
                              {formatDecimalBR(effortVal)}%
                            </Text>
                            <Pressable
                              onPressIn={() =>
                                startHoldAction(() => {
                                  triggerHaptic('selection');
                                  setEffortVal((prev) => Math.min(100, prev + 2.5));
                                })
                              }
                              onPressOut={clearHoldTimer}
                              style={styles.stepperBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Aumentar porcentagem"
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={styles.stepperBtnText}>+</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Incremento sobre última semana / sessão */}
                    {(effortMode === 'last_week_plus' ||
                      effortMode === 'last_session_plus') && (
                      <View style={styles.stepperCard}>
                        <Text style={styles.stepperLabel}>Incremento ({unit})</Text>
                        <View style={styles.incrementRow}>
                          <Text style={styles.plusSymbol}>+</Text>
                          <TextInput
                            value={incrementInput}
                            onChangeText={setIncrementInput}
                            onFocus={() => setIsIncrementFocused(true)}
                            onBlur={handleIncrementBlur}
                            keyboardType="decimal-pad"
                            style={[
                              styles.incrementTextInput,
                              isIncrementFocused && styles.inputFocused,
                            ]}
                            accessibilityLabel={`Incremento em ${unit}`}
                          />
                          <Text style={styles.unitSuffix}>{unit}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* 4. Redução automática de carga do Drop Set (%) */}
              {type === 'drop' && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Redução automática da carga (%)</Text>

                  {/* Chips de atalhos rápidos com alvo >= 48dp */}
                  <View style={styles.wrapRow}>
                    {DROP_PERCENT_PRESETS.map((pct) => {
                      const isSelected = dropPercent === pct;
                      return (
                        <Pressable
                          key={pct}
                          onPress={() => {
                            triggerHaptic('selection');
                            setDropPercent(pct);
                            setDropPercentInput(String(pct));
                          }}
                          style={[
                            styles.smallChip,
                            isSelected
                              ? styles.smallChipSelected
                              : styles.smallChipUnselected,
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={`Redução de ${pct}%`}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Text
                            style={[
                              styles.smallChipText,
                              isSelected
                                ? styles.smallChipTextSelected
                                : styles.smallChipTextUnselected,
                            ]}
                          >
                            −{pct}%
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Campo numérico livre (1 a 90%) */}
                  <View style={styles.dropCustomInputRow}>
                    <Text style={styles.dropCustomInputLabel}>Personalizado (1 a 90%):</Text>
                    <View
                      style={[
                        styles.dropCustomInputWrap,
                        isDropFocused && styles.inputFocused,
                      ]}
                    >
                      <TextInput
                        value={dropPercentInput}
                        onChangeText={handleDropPercentInputChange}
                        onFocus={() => setIsDropFocused(true)}
                        onBlur={handleDropPercentInputBlur}
                        keyboardType="numeric"
                        maxLength={3}
                        style={styles.dropCustomTextInput}
                        accessibilityLabel="Porcentagem personalizada de redução de carga"
                        placeholder="20"
                        placeholderTextColor={colors.textMuted}
                      />
                      <Text style={styles.dropCustomInputSuffix}>%</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 5. Descanso individual desta série */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Descanso desta série</Text>
                <View style={styles.wrapRow}>
                  {SET_REST_OPTIONS.map((sec) => {
                    const isSelected = rest === sec;
                    return (
                      <Pressable
                        key={String(sec)}
                        onPress={() => {
                          triggerHaptic('selection');
                          setRest(sec);
                        }}
                        style={[
                          styles.smallChip,
                          isSelected
                            ? styles.smallChipSelected
                            : styles.smallChipUnselected,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={formatRestShort(sec)}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Text
                          style={[
                            styles.smallChipText,
                            isSelected
                              ? styles.smallChipTextSelected
                              : styles.smallChipTextUnselected,
                          ]}
                        >
                          {formatRestShort(sec)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {type === 'drop' && (
                  <Text style={styles.discreetNoticeText}>
                    Pausa zero se houver outro Drop abaixo; o descanso só inicia após o último Drop.
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* Ações (Aplicar e Remover série com segurança) */}
            <View style={styles.actionsFooter}>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.applyBtn,
                  pressed && styles.applyBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Aplicar alterações na série"
              >
                <Text style={styles.applyBtnText}>Aplicar alterações</Text>
              </Pressable>

              <Pressable
                onPress={handleRemove}
                style={({ pressed }) => [
                  styles.removeBtn,
                  pressed && styles.removeBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Remover série do exercício"
              >
                <Trash2 size={16} color={colors.error} strokeWidth={1.75} />
                <Text style={styles.removeBtnText}>Remover série</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay, // rgba(0, 0, 0, 0.65)
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    width: '100%',
    backgroundColor: colors.surfaceContainer, // #23201D
    borderTopLeftRadius: radii.sheet, // 28px
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant, // #3A3531
    paddingHorizontal: spacing.margin, // 20px
    paddingTop: spacing.xs,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: spacing.gutter,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.outline, // #7D746B
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  closeBtn: {
    width: spacing.touchTargetMin, // 48dp
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipBtn: {
    flex: 1,
    height: spacing.touchTargetMin, // 48dp
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipBtnSelected: {
    backgroundColor: colors.primary, // #FF7A59
    borderColor: colors.primary,
  },
  chipBtnUnselected: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderColor: colors.outlineVariant, // #3A3531
  },
  chipBtnText: {
    fontSize: 13,
    fontFamily: fontFamilies.dmSansMedium,
  },
  chipBtnTextSelected: {
    color: colors.onPrimary, // #1A1715
    fontFamily: fontFamilies.outfitBold,
  },
  chipBtnTextUnselected: {
    color: colors.onSurfaceVariant,
  },
  chipBtnDisabled: {
    opacity: 0.4,
    borderColor: colors.surfaceContainer,
    backgroundColor: colors.surfaceContainerLow,
  },
  chipBtnTextDisabled: {
    color: colors.textMuted,
  },
  discreetNoticeText: {
    fontSize: 12,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 16,
  },
  failureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: spacing.touchTargetMin,
  },
  failureNoticeText: {
    fontSize: 13,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.onSurface,
    flex: 1,
  },
  controlsGroup: {
    gap: 12,
  },
  stepperCard: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    borderRadius: radii.input, // 16px
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  stepperTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  stepperLabel: {
    fontSize: 13,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurfaceVariant,
  },
  stepperSubtext: {
    fontSize: 12,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: spacing.touchTargetMin, // 48x48dp circular stepper button
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 22,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
    lineHeight: 24,
  },
  stepperValue: {
    minWidth: 46,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: fontFamilies.outfitBold,
    fontVariant: ['tabular-nums'],
    color: colors.onSurface,
  },
  stepperValuePercent: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    fontVariant: ['tabular-nums'],
    color: colors.primary,
  },
  stepperGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  stepperGridCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.input,
    padding: 12,
  },
  stepperGridLabel: {
    fontSize: 12,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  stepperGridControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperGridBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueCompact: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    fontVariant: ['tabular-nums'],
    color: colors.onSurface,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: radii.input,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  smallChipUnselected: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.outlineVariant,
  },
  smallChipText: {
    fontSize: 13,
    fontFamily: fontFamilies.dmSansMedium,
    fontVariant: ['tabular-nums'],
  },
  smallChipTextSelected: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.outfitBold,
  },
  smallChipTextUnselected: {
    color: colors.onSurfaceVariant,
  },
  incrementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusSymbol: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    color: colors.primary,
  },
  incrementTextInput: {
    width: 80,
    height: spacing.touchTargetMin, // 48dp
    textAlign: 'center',
    borderRadius: radii.input,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
    paddingHorizontal: 8,
  },
  unitSuffix: {
    fontSize: 13,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.onSurfaceVariant,
  },
  dropCustomInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  dropCustomInputLabel: {
    fontSize: 13,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.onSurfaceVariant,
  },
  dropCustomInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.input,
    paddingHorizontal: 10,
    height: spacing.touchTargetMin, // 48dp
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  dropCustomTextInput: {
    width: 48,
    textAlign: 'center',
    color: colors.onSurface,
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  dropCustomInputSuffix: {
    fontSize: 14,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurfaceVariant,
  },
  actionsFooter: {
    paddingTop: spacing.sm,
    gap: 10,
  },
  applyBtn: {
    width: '100%',
    height: spacing.buttonHeight, // 56px
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnPressed: {
    backgroundColor: colors.accentPressed,
    transform: [{ scale: 0.995 }],
  },
  applyBtnText: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onPrimary,
  },
  removeBtn: {
    width: '100%',
    height: spacing.touchTargetMin, // 48dp
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  removeBtnPressed: {
    backgroundColor: 'rgba(255, 107, 107, 0.22)',
  },
  removeBtnText: {
    fontSize: 14,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.error,
  },
});
