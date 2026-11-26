import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
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
  REPS_MODE_OPTIONS,
  formatDecimalBR,
  kgToDisplay,
  displayToKg,
  formatWeight,
  suggest1RmWeightKg,
  sanitizePlannedSet,
  canSetBeDrop,
  DROP_PERCENT_PRESETS,
} from '../domain/sessionMath';

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
  { value: 'reps', label: 'Reps' },
  { value: 'reps_range', label: 'Faixa de Reps (Reps Range)' },
  { value: 'reps_max', label: 'Reps Max' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'time', label: 'Tempo (Time)' },
  { value: 'time_range', label: 'Faixa de Tempo (Time Range)' },
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
  { value: 'rpe_range', label: 'Faixa de RPE (RPE Range)' },
  { value: 'rir', label: 'RIR' },
  { value: 'percent_1rm', label: '% de 1RM' },
  { value: 'percent_1rm_exercise', label: '% de 1RM de X Exercício' },
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

  const [type, setType] = useState<SetType>('normal');
  const [repsMode, setRepsMode] = useState<RepsMode>('reps_range');
  const [minVal, setMinVal] = useState<number>(8);
  const [maxVal, setMaxVal] = useState<number>(10);

  const [effortMode, setEffortMode] = useState<EffortMode>('none');
  const [effortVal, setEffortVal] = useState<number>(8);
  const [effortValMax, setEffortValMax] = useState<number>(9);
  const [effortRefExId, setEffortRefExId] = useState<string>(catalog[0]?.id || 'ex-1');
  const [incrementInput, setIncrementInput] = useState<string>('2,5');

  const [dropPercent, setDropPercent] = useState<number>(20);
  const [dropPercentInput, setDropPercentInput] = useState<string>('20');

  const [rest, setRest] = useState<number | null>(null);

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

  const handleRemove = () => {
    triggerHaptic('medium');
    onRemove(set.id);
    onClose();
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
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />

        <View style={[styles.sheetContainer, { maxHeight: height * 0.9 }]}>
          {/* Alça do sheet */}
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
            >
              <X size={18} color="#A1A1A6" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
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
              <Text style={styles.sectionLabel}>Meta de Reps / Tempo</Text>

              {isFailureLike ? (
                <View style={styles.failureNotice}>
                  <Flame size={16} color="#FF7A59" />
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

                  {/* 1 Stepper (Reps, Tempo ou Reps Max) */}
                  {(repsMode === 'reps' || repsMode === 'time' || repsMode === 'reps_max') && (
                    <View style={styles.stepperCard}>
                      <Text style={styles.stepperLabel}>
                        {isTimeMode
                          ? 'Duração alvo (seg)'
                          : repsMode === 'reps_max'
                          ? 'Máximo de repetições'
                          : 'Repetições alvo'}
                      </Text>
                      <View style={styles.stepperControls}>
                        <Pressable
                          onPress={() => {
                            if (repsMode === 'reps_max') {
                              setMaxVal(Math.max(1, maxVal - 1));
                            } else {
                              setMinVal(Math.max(stepAmount, minVal - stepAmount));
                            }
                          }}
                          style={styles.stepperBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Diminuir"
                        >
                          <Text style={styles.stepperBtnText}>-</Text>
                        </Pressable>
                        <Text style={styles.stepperValue}>
                          {repsMode === 'reps_max' ? maxVal : minVal}
                          {isTimeMode ? 's' : ''}
                        </Text>
                        <Pressable
                          onPress={() => {
                            if (repsMode === 'reps_max') {
                              setMaxVal(maxVal + 1);
                            } else {
                              setMinVal(minVal + stepAmount);
                            }
                          }}
                          style={styles.stepperBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Aumentar"
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {/* 2 Steppers (Faixa de Reps ou Faixa de Tempo) */}
                  {(repsMode === 'reps_range' || repsMode === 'time_range') && (
                    <View style={styles.stepperGrid}>
                      <View style={styles.stepperGridCard}>
                        <Text style={styles.stepperLabel}>Mín</Text>
                        <View style={styles.stepperControls}>
                          <Pressable
                            onPress={() =>
                              setMinVal(Math.max(stepAmount, minVal - stepAmount))
                            }
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Diminuir mínimo"
                          >
                            <Text style={styles.stepperBtnText}>-</Text>
                          </Pressable>
                          <Text style={styles.stepperValueCompact}>
                            {minVal}
                            {isTimeMode ? 's' : ''}
                          </Text>
                          <Pressable
                            onPress={() => {
                              const next = minVal + stepAmount;
                              setMinVal(next);
                              if (next > maxVal) setMaxVal(next);
                            }}
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Aumentar mínimo"
                          >
                            <Text style={styles.stepperBtnText}>+</Text>
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.stepperGridCard}>
                        <Text style={styles.stepperLabel}>Máx</Text>
                        <View style={styles.stepperControls}>
                          <Pressable
                            onPress={() =>
                              setMaxVal(Math.max(minVal, maxVal - stepAmount))
                            }
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Diminuir máximo"
                          >
                            <Text style={styles.stepperBtnText}>-</Text>
                          </Pressable>
                          <Text style={styles.stepperValueCompact}>
                            {maxVal}
                            {isTimeMode ? 's' : ''}
                          </Text>
                          <Pressable
                            onPress={() => setMaxVal(maxVal + stepAmount)}
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Aumentar máximo"
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
                <Text style={styles.sectionLabel}>Meta de Esforço / Carga</Text>

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
                        <Text style={styles.stepperLabel}>RPE Mín</Text>
                        <View style={styles.stepperControls}>
                          <Pressable
                            onPress={() =>
                              setEffortVal(
                                Math.max(6, Number((effortVal - 0.5).toFixed(1)))
                              )
                            }
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Diminuir RPE mínimo"
                          >
                            <Text style={styles.stepperBtnText}>-</Text>
                          </Pressable>
                          <Text style={styles.stepperValueCompact}>
                            {formatDecimalBR(effortVal)}
                          </Text>
                          <Pressable
                            onPress={() => {
                              const next = Math.min(
                                10,
                                Number((effortVal + 0.5).toFixed(1))
                              );
                              setEffortVal(next);
                              if (next > effortValMax) setEffortValMax(next);
                            }}
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Aumentar RPE mínimo"
                          >
                            <Text style={styles.stepperBtnText}>+</Text>
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.stepperGridCard}>
                        <Text style={styles.stepperLabel}>RPE Máx</Text>
                        <View style={styles.stepperControls}>
                          <Pressable
                            onPress={() =>
                              setEffortValMax(
                                Math.max(
                                  effortVal,
                                  Number((effortValMax - 0.5).toFixed(1))
                                )
                              )
                            }
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Diminuir RPE máximo"
                          >
                            <Text style={styles.stepperBtnText}>-</Text>
                          </Pressable>
                          <Text style={styles.stepperValueCompact}>
                            {formatDecimalBR(effortValMax)}
                          </Text>
                          <Pressable
                            onPress={() =>
                              setEffortValMax(
                                Math.min(
                                  10,
                                  Number((effortValMax + 0.5).toFixed(1))
                                )
                              )
                            }
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Aumentar RPE máximo"
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
                              No treino: ~{formatWeight(estimated1RmKg, unit)} {unit}
                            </Text>
                          )}
                        </View>
                        <View style={styles.stepperControls}>
                          <Pressable
                            onPress={() =>
                              setEffortVal(Math.max(30, effortVal - 2.5))
                            }
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Diminuir porcentagem"
                          >
                            <Text style={styles.stepperBtnText}>-</Text>
                          </Pressable>
                          <Text
                            style={[
                              styles.stepperValueCompact,
                              { color: '#FF7A59', minWidth: 50 },
                            ]}
                          >
                            {formatDecimalBR(effortVal)}%
                          </Text>
                          <Pressable
                            onPress={() =>
                              setEffortVal(Math.min(100, effortVal + 2.5))
                            }
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Aumentar porcentagem"
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
                          keyboardType="decimal-pad"
                          style={styles.incrementTextInput}
                          accessibilityLabel={`Incremento em ${unit}`}
                        />
                        <Text style={styles.unitSuffix}>{unit}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Seção Drop Set: Redução automática da carga (%) */}
            {type === 'drop' && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Redução automática da carga (%)</Text>

                {/* Chips de atalho rápido */}
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
                        accessibilityLabel={`-${pct}%`}
                      >
                        <Text
                          style={[
                            styles.smallChipText,
                            isSelected
                              ? styles.smallChipTextSelected
                              : styles.smallChipTextUnselected,
                          ]}
                        >
                          -{pct}%
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Campo numérico livre (1 a 90%) */}
                <View style={styles.dropCustomInputRow}>
                  <Text style={styles.dropCustomInputLabel}>Personalizado (1 a 90%):</Text>
                  <View style={styles.dropCustomInputWrap}>
                    <TextInput
                      value={dropPercentInput}
                      onChangeText={handleDropPercentInputChange}
                      onBlur={handleDropPercentInputBlur}
                      keyboardType="numeric"
                      maxLength={3}
                      style={styles.dropCustomTextInput}
                      accessibilityLabel="Porcentagem personalizada de redução de carga"
                      placeholder="20"
                      placeholderTextColor="#636366"
                    />
                    <Text style={styles.dropCustomInputSuffix}>%</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 4. Descanso individual desta série */}
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

          {/* 5. Ações (Aplicar e Remover) */}
          <View style={styles.actionsFooter}>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.applyBtn,
                pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Aplicar alterações na série"
            >
              <Text style={styles.applyBtnText}>Aplicar</Text>
            </Pressable>

            <Pressable
              onPress={handleRemove}
              style={({ pressed }) => [
                styles.removeBtn,
                pressed && { opacity: 0.88 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Remover série"
            >
              <Trash2 size={15} color="#FF6B6B" />
              <Text style={styles.removeBtnText}>Remover série</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
    backgroundColor: '#23201D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: '#2D2925',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38332F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5EFE8',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2D2925',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B7ADA3',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipBtnSelected: {
    backgroundColor: '#FF7A59',
    borderColor: '#FF7A59',
  },
  chipBtnUnselected: {
    backgroundColor: '#2D2925',
    borderColor: '#38332F',
  },
  chipBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipBtnTextSelected: {
    color: '#1A1715',
  },
  chipBtnTextUnselected: {
    color: '#B7ADA3',
  },
  failureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2D2925',
    borderWidth: 1,
    borderColor: '#38332F',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  failureNoticeText: {
    fontSize: 12,
    color: '#F5EFE8',
    flex: 1,
  },
  controlsGroup: {
    gap: 10,
  },
  stepperCard: {
    backgroundColor: '#2D2925',
    borderWidth: 1,
    borderColor: '#38332F',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperTextWrap: {
    flex: 1,
  },
  stepperLabel: {
    fontSize: 12,
    color: '#B7ADA3',
    fontWeight: '500',
  },
  stepperSubtext: {
    fontSize: 11,
    color: '#7D746B',
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#38332F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5EFE8',
    lineHeight: 18,
  },
  stepperValue: {
    minWidth: 42,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#F5EFE8',
  },
  stepperValueCompact: {
    minWidth: 34,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#F5EFE8',
  },
  stepperGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  stepperGridCard: {
    flex: 1,
    backgroundColor: '#2D2925',
    borderWidth: 1,
    borderColor: '#38332F',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  smallChipSelected: {
    backgroundColor: '#FF7A59',
    borderColor: '#FF7A59',
  },
  smallChipUnselected: {
    backgroundColor: '#2D2925',
    borderColor: '#38332F',
  },
  smallChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallChipTextSelected: {
    color: '#1A1715',
    fontWeight: '700',
  },
  smallChipTextUnselected: {
    color: '#B7ADA3',
  },
  incrementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plusSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF7A59',
  },
  incrementTextInput: {
    width: 68,
    height: 32,
    textAlign: 'center',
    borderRadius: 8,
    backgroundColor: '#38332F',
    borderWidth: 1,
    borderColor: '#2D2925',
    color: '#F5EFE8',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 0,
    paddingHorizontal: 6,
  },
  unitSuffix: {
    fontSize: 12,
    color: '#B7ADA3',
  },
  actionsFooter: {
    gap: 8,
    paddingTop: 6,
  },
  applyBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#FF7A59',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1715',
  },
  removeBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  removeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  chipBtnDisabled: {
    opacity: 0.4,
    borderColor: '#23201D',
    backgroundColor: '#1F1B19',
  },
  chipBtnTextDisabled: {
    color: '#7D746B',
  },
  discreetNoticeText: {
    fontSize: 12,
    color: '#B7ADA3',
    marginTop: 8,
    lineHeight: 16,
  },
  dropCustomInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  dropCustomInputLabel: {
    fontSize: 13,
    color: '#B7ADA3',
    fontWeight: '500',
  },
  dropCustomInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38332F',
    borderWidth: 1,
    borderColor: '#2D2925',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 34,
  },
  dropCustomTextInput: {
    width: 48,
    textAlign: 'center',
    color: '#F5EFE8',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  dropCustomInputSuffix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B7ADA3',
  },
});
