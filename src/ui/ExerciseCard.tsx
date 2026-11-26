import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
} from 'react-native';
import {
  Clock,
  Plus,
  RefreshCw,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react-native';
import { SetTable, SetVM, SetMenuAction } from './session/SetTable';
import { Unit, formatRestShort } from '../domain/sessionMath';
import { triggerHaptic } from './haptics';

export interface ExerciseCardProps {
  index: number;
  exercise: {
    id: string;
    exerciseId?: string;
    name: string;
    restS?: number | null;
    defaultRest?: number | null;
    defaultRestS?: number | null;
    note?: string | null;
    sets?: SetVM[] | any[];
  };
  mode?: 'preview' | 'active';
  unit?: Unit;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isExpanded?: boolean;
  defaultExpanded?: boolean;
  onToggleExpand?: (exerciseId: string) => void;
  onCycleRest?: (exerciseId: string) => void;
  onUpdateNote?: (exerciseId: string, note: string) => void;
  onOpenAddSet?: (exerciseId: string) => void;
  onSwapExercise?: (exerciseId: string) => void;
  onRemoveExercise?: (exerciseId: string) => void;
  onMoveUp?: (exerciseId: string) => void;
  onMoveDown?: (exerciseId: string) => void;
  onRowClick?: (exercise: any, set: any, badgeLabel: string) => void;
  onMenuAction?: (exerciseId: string, action: SetMenuAction, setId: string) => void;
  onHeaderPress?: (exerciseId: string) => void;
  onOpenExerciseOptions?: (exerciseId: string) => void;
  // Callbacks para modo ativo (Etapa 5)
  onToggleComplete?: (exerciseId: string, set: SetVM) => void;
  onActiveChange?: (exerciseId: string, setId: string, field: string, value: any) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  index,
  exercise,
  mode = 'preview',
  unit = 'kg',
  canMoveUp = false,
  canMoveDown = false,
  isExpanded: isExpandedProp,
  defaultExpanded = true,
  onToggleExpand,
  onCycleRest,
  onUpdateNote,
  onOpenAddSet,
  onSwapExercise,
  onRemoveExercise,
  onMoveUp,
  onMoveDown,
  onRowClick,
  onMenuAction,
  onHeaderPress,
  onOpenExerciseOptions,
  onToggleComplete,
  onActiveChange,
}) => {
  const [exerciseMenuVisible, setExerciseMenuVisible] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  const isExpanded = isExpandedProp !== undefined ? isExpandedProp : internalExpanded;

  const handleToggle = () => {
    triggerHaptic('light');
    if (onToggleExpand) {
      onToggleExpand(exercise.id);
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const handleOpenOptions = () => {
    triggerHaptic('light');
    if (onHeaderPress) {
      onHeaderPress(exercise.id);
    } else if (onOpenExerciseOptions) {
      onOpenExerciseOptions(exercise.id);
    } else {
      setExerciseMenuVisible(true);
    }
  };

  const restSeconds =
    exercise.restS ??
    exercise.defaultRest ??
    exercise.defaultRestS ??
    90;

  const setsList = exercise.sets || [];
  const completedCount = setsList.filter(
    (s: any) => Boolean(s.completed || (s.completedAt !== null && s.completedAt !== undefined))
  ).length;
  const totalSets = setsList.length;
  const isAllCompleted = mode === 'active' && totalSets > 0 && completedCount === totalSets;

  let collapsedSubtitle = '';
  if (mode === 'active') {
    if (completedCount === totalSets && totalSets > 0) {
      collapsedSubtitle = `${totalSets}/${totalSets} séries concluídas ✓`;
    } else if (completedCount > 0) {
      collapsedSubtitle = `${completedCount}/${totalSets} séries concluídas`;
    } else {
      collapsedSubtitle = `${totalSets} ${totalSets === 1 ? 'série' : 'séries'}`;
    }
  } else {
    collapsedSubtitle = `${totalSets} ${totalSets === 1 ? 'série' : 'séries'}`;
  }

  return (
    <View
      style={[
        styles.cardContainer,
        !isExpanded && styles.cardContainerCollapsed,
        !isExpanded && isAllCompleted && styles.cardContainerComplete,
      ]}
    >
      {/* 1. CABEÇALHO DO CARD */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.headerLeft}
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={`Exercício ${index + 1}: ${exercise.name}. ${isExpanded ? 'Toque para minimizar' : 'Toque para expandir'}`}
        >
          <Text style={styles.indexText}>{index + 1}</Text>
          <View style={styles.headerTitleWrap}>
            <View style={styles.nameAndChevronRow}>
              <Text style={styles.exerciseNameText} numberOfLines={1}>
                {exercise.name}
              </Text>
              {isExpanded ? (
                <ChevronDown size={15} color="#71717A" strokeWidth={2} style={styles.chevron} />
              ) : (
                <ChevronRight size={15} color="#71717A" strokeWidth={2} style={styles.chevron} />
              )}
            </View>
            {!isExpanded && (
              <Text
                style={[
                  styles.collapsedSubtitleText,
                  isAllCompleted && styles.collapsedSubtitleTextComplete,
                ]}
                numberOfLines={1}
              >
                {collapsedSubtitle}
              </Text>
            )}
          </View>
        </Pressable>

        <View style={styles.headerRightControls}>
          {/* Botão compacto de descanso */}
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onCycleRest?.(exercise.id);
            }}
            style={({ pressed }) => [
              styles.restBadgeBtn,
              pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Descanso ${formatRestShort(restSeconds)}. Tocar para alternar.`}
          >
            <Clock size={13} color="#FF7A59" strokeWidth={2.2} />
            <Text style={styles.restBadgeText}>{formatRestShort(restSeconds)}</Text>
          </Pressable>

          {/* Botão ••• no cabeçalho (para acessar opções mesmo minimizado) */}
          <Pressable
            onPress={handleOpenOptions}
            style={({ pressed }) => [
              styles.headerMoreBtn,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Mais opções para ${exercise.name}`}
          >
            <MoreHorizontal size={18} color="#8E8E93" />
          </Pressable>
        </View>
      </View>

      {/* 2. CORPO EXPANDIDO */}
      {isExpanded && (
        <>
          {/* NOTA INLINE DISCRETA */}
          <TextInput
            value={exercise.note || ''}
            onChangeText={(text) => onUpdateNote?.(exercise.id, text)}
            placeholder="Adicionar nota do exercício..."
            placeholderTextColor="#636366"
            style={styles.noteInput}
            accessibilityLabel="Nota do exercício"
          />

          {/* CORPO: SetTable */}
          <SetTable
            mode={mode}
            sets={exercise.sets || []}
            unit={unit}
            previous={(exercise.sets || []).map((s: any) => s.previous ?? null)}
            onRowClick={(set, badgeLabel) => onRowClick?.(exercise, set, badgeLabel)}
            onMenuAction={(action, setId) => onMenuAction?.(exercise.id, action, setId)}
            onToggle={(setId) => {
              const targetSet = (exercise.sets || []).find((s) => s.id === setId);
              if (targetSet) onToggleComplete?.(exercise.id, targetSet);
            }}
            onEditWeight={(setId) => onActiveChange?.(exercise.id, setId, 'weight', null)}
            onEditReps={(setId) => onActiveChange?.(exercise.id, setId, 'reps', null)}
            onActiveChange={(setId, field, val) => onActiveChange?.(exercise.id, setId, field, val)}
          />

          {/* RODAPÉ DO CARD: + Adicionar série, Substituir, ••• */}
          <View style={styles.footerRow}>
            <View style={styles.footerActionsLeft}>
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onOpenAddSet?.(exercise.id);
                }}
                style={({ pressed }) => [
                  styles.footerActionBtn,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Adicionar série"
              >
                <Plus size={15} color="#FF7A59" strokeWidth={2.4} />
                <Text style={styles.addSetText}>Adicionar série</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onSwapExercise?.(exercise.id);
                }}
                style={({ pressed }) => [
                  styles.footerActionBtn,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Substituir exercício"
              >
                <RefreshCw size={13} color="#8E8E93" strokeWidth={2} />
                <Text style={styles.swapText}>Substituir</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleOpenOptions}
              style={({ pressed }) => [
                styles.moreBtn,
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Mais opções para ${exercise.name}`}
            >
              <MoreHorizontal size={18} color="#8E8E93" />
            </Pressable>
          </View>
        </>
      )}

      {/* MODAL DE OPÇÕES DO EXERCÍCIO (Remover, Reordenar) */}
      {exerciseMenuVisible && (
        <Modal
          transparent
          visible={exerciseMenuVisible}
          animationType="fade"
          onRequestClose={() => setExerciseMenuVisible(false)}
        >
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setExerciseMenuVisible(false)}
          >
            <Pressable
              style={styles.menuContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <Pressable
                  onPress={() => setExerciseMenuVisible(false)}
                  hitSlop={8}
                >
                  <X size={18} color="#8E8E93" />
                </Pressable>
              </View>

              {canMoveUp && (
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                  ]}
                  onPress={() => {
                    setExerciseMenuVisible(false);
                    onMoveUp?.(exercise.id);
                  }}
                >
                  <ArrowUp size={16} color="#E5E5EA" />
                  <Text style={styles.menuItemText}>Mover para cima</Text>
                </Pressable>
              )}

              {canMoveDown && (
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                  ]}
                  onPress={() => {
                    setExerciseMenuVisible(false);
                    onMoveDown?.(exercise.id);
                  }}
                >
                  <ArrowDown size={16} color="#E5E5EA" />
                  <Text style={styles.menuItemText}>Mover para baixo</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={() => {
                  setExerciseMenuVisible(false);
                  onRemoveExercise?.(exercise.id);
                }}
              >
                <Trash2 size={16} color="#FF453A" />
                <Text style={[styles.menuItemText, { color: '#FF453A' }]}>
                  Remover exercício
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#23201D',
    borderWidth: 1,
    borderColor: '#2D2925',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardContainerCollapsed: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardContainerComplete: {
    borderColor: 'rgba(255, 122, 89, 0.4)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameAndChevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  collapsedSubtitleText: {
    fontSize: 11.5,
    color: '#B7ADA3',
    marginTop: 2,
  },
  collapsedSubtitleTextComplete: {
    color: '#FF7A59',
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B7ADA3',
    marginRight: 6,
  },
  exerciseNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5EFE8',
    flexShrink: 1,
  },
  chevron: {
    marginLeft: 3,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerMoreBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restBadgeBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2D2925',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  restBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F5EFE8',
  },
  noteInput: {
    fontSize: 12,
    color: '#B7ADA3',
    paddingVertical: 4,
    marginTop: 2,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2D2925',
  },
  footerActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addSetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F5EFE8',
  },
  swapText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B7ADA3',
  },
  moreBtn: {
    padding: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#23201D',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2D2925',
    padding: 14,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2925',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5EFE8',
    flex: 1,
    marginRight: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuItemPressed: {
    backgroundColor: '#2D2925',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F5EFE8',
  },
});
