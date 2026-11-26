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
  onToggleComplete,
  onActiveChange,
}) => {
  const [exerciseMenuVisible, setExerciseMenuVisible] = useState(false);

  const restSeconds =
    exercise.restS ??
    exercise.defaultRest ??
    exercise.defaultRestS ??
    90;

  return (
    <View style={styles.cardContainer}>
      {/* 1. CABEÇALHO DO CARD */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.headerLeft}
          onPress={() => onHeaderPress?.(exercise.id)}
          accessibilityRole="button"
          accessibilityLabel={`Exercício ${index + 1}: ${exercise.name}`}
        >
          <Text style={styles.indexText}>{index + 1}</Text>
          <Text style={styles.exerciseNameText} numberOfLines={1}>
            {exercise.name}
          </Text>
          <ChevronRight size={15} color="#71717A" strokeWidth={2} style={styles.chevron} />
        </Pressable>

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
          <Clock size={13} color="#F5C400" strokeWidth={2.2} />
          <Text style={styles.restBadgeText}>{formatRestShort(restSeconds)}</Text>
        </Pressable>
      </View>

      {/* 2. NOTA INLINE DISCRETA */}
      <TextInput
        value={exercise.note || ''}
        onChangeText={(text) => onUpdateNote?.(exercise.id, text)}
        placeholder="Adicionar nota do exercício..."
        placeholderTextColor="#636366"
        style={styles.noteInput}
        accessibilityLabel="Nota do exercício"
      />

      {/* 3. CORPO: SetTable */}
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

      {/* 4. RODAPÉ DO CARD: + Adicionar série, Substituir, ••• */}
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
            <Plus size={15} color="#FF6B57" strokeWidth={2.4} />
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
          onPress={() => {
            triggerHaptic('light');
            setExerciseMenuVisible(true);
          }}
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
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
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
  indexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A1A1AA',
    marginRight: 6,
  },
  exerciseNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5C400',
    flexShrink: 1,
  },
  chevron: {
    marginLeft: 3,
  },
  restBadgeBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  restBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E5E5EA',
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
    borderTopColor: 'rgba(44, 44, 46, 0.8)',
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
    color: '#E5E5EA',
  },
  swapText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
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
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    padding: 14,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5C400',
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
    backgroundColor: '#2C2C2E',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E5E5EA',
  },
});
