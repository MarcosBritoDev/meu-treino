import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { GripVertical } from 'lucide-react-native';
import { colors, fontFamilies, radii } from '../theme';
import { Text } from './Text';
import { triggerHaptic } from './haptics';
import { WorkoutExerciseForEdit } from '../db/workouts';

// Habilita animações de layout nativas no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface ReorderableExerciseListProps {
  exercises: WorkoutExerciseForEdit[];
  onReorder: (reordered: WorkoutExerciseForEdit[]) => void;
  onPressItem: (index: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface ExerciseRowProps {
  item: WorkoutExerciseForEdit;
  index: number;
  totalCount: number;
  isDraggingThis: boolean;
  isAnyDragging: boolean;
  onStartDrag: (index: number) => void;
  onSwap: (fromIndex: number, toIndex: number) => void;
  onEndDrag: () => void;
  onPress: () => void;
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({
  item,
  index,
  totalCount,
  isDraggingThis,
  isAnyDragging,
  onStartDrag,
  onSwap,
  onEndDrag,
  onPress,
}) => {
  const accumulatedDy = useRef(0);
  const dragY = useRef(new Animated.Value(0)).current;

  // Refs mutáveis para evitar re-criação do PanResponder durante o gesto
  const propsRef = useRef({
    index,
    item,
    isDraggingThis,
    onStartDrag,
    onSwap,
    onEndDrag,
    totalCount,
  });

  useEffect(() => {
    propsRef.current = {
      index,
      item,
      isDraggingThis,
      onStartDrag,
      onSwap,
      onEndDrag,
      totalCount,
    };
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 2,
      onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dy) > 2,

      onPanResponderGrant: () => {
        accumulatedDy.current = 0;
        dragY.setValue(0);
        propsRef.current.onStartDrag(propsRef.current.index);
        triggerHaptic('medium');
      },

      onPanResponderMove: (_, gesture) => {
        const currentDy = gesture.dy - accumulatedDy.current;
        dragY.setValue(currentDy);

        const STEP = 40; // Limiar de troca rápida e intuitiva
        const curIdx = propsRef.current.index;
        const count = propsRef.current.totalCount;

        // Arrastando para baixo: ultrapassa o limiar para o próximo slot
        if (currentDy > STEP && curIdx < count - 1) {
          accumulatedDy.current += 76;
          dragY.setValue(currentDy - 76);
          triggerHaptic('selection');
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          propsRef.current.onSwap(curIdx, curIdx + 1);
        }
        // Arrastando para cima: ultrapassa o limiar para o slot anterior
        else if (currentDy < -STEP && curIdx > 0) {
          accumulatedDy.current -= 76;
          dragY.setValue(currentDy + 76);
          triggerHaptic('selection');
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          propsRef.current.onSwap(curIdx, curIdx - 1);
        }
      },

      onPanResponderRelease: () => {
        finishDrag();
      },

      onPanResponderTerminate: () => {
        finishDrag();
      },
    })
  ).current;

  const finishDrag = () => {
    Animated.spring(dragY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start(() => {
      dragY.setValue(0);
      accumulatedDy.current = 0;
      propsRef.current.onEndDrag();
      triggerHaptic('success');
    });
  };

  const formattedIndex = String(index + 1).padStart(2, '0');

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        isDraggingThis && styles.cardContainerDragging,
        isDraggingThis && {
          transform: [{ translateY: dragY }, { scale: 1.03 }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={isAnyDragging}
        style={({ pressed }) => [
          styles.exerciseCard,
          isDraggingThis && styles.exerciseCardDragging,
          pressed && !isDraggingThis && styles.exerciseCardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.targetSets} séries de ${item.repMin} a ${item.repMax} repetições. Toque para editar metas.`}
      >
        <View style={styles.exerciseCardLeft}>
          {/* Número ordinal estilizado */}
          <Text
            variant="displayMedium"
            style={[
              styles.ordinalNumber,
              isDraggingThis && styles.ordinalNumberDragging,
            ]}
          >
            {formattedIndex}
          </Text>

          {/* Nome e Metas do Exercício */}
          <View style={styles.exerciseInfo}>
            <Text
              variant="bodyMedium"
              style={styles.exerciseNameText}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text variant="bodySmall" style={styles.exerciseMetaText}>
              {item.targetSets} séries · {item.repMin}-{item.repMax} reps · {item.restS}s
            </Text>
          </View>
        </View>

        {/* Alça de Arrasto (Sem setas, 100% interativa com área de toque ampliada) */}
        <View
          {...panResponder.panHandlers}
          style={styles.dragHandleTouchArea}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel={`Arrastar para reordenar ${item.name}`}
        >
          <View
            style={[
              styles.dragHandleBox,
              isDraggingThis && styles.dragHandleBoxActive,
            ]}
          >
            <GripVertical
              size={20}
              color={isDraggingThis ? colors.primary : colors.onSurfaceVariant}
              strokeWidth={2}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const ReorderableExerciseList: React.FC<ReorderableExerciseListProps> = ({
  exercises,
  onReorder,
  onPressItem,
  onDragStart,
  onDragEnd,
}) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const handleStartDrag = (index: number) => {
    const item = exercises[index];
    if (item) {
      setActiveDragId(item.id || item.exerciseId);
    }
    onDragStart?.();
  };

  const handleSwap = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= exercises.length || toIndex >= exercises.length) return;

    const updated = [...exercises];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    const reindexed = updated.map((e, idx) => ({ ...e, position: idx }));
    onReorder(reindexed);
  };

  const handleEndDrag = () => {
    setActiveDragId(null);
    onDragEnd?.();
  };

  const isAnyDragging = activeDragId !== null;

  return (
    <View style={styles.container}>
      {exercises.map((item, index) => {
        const itemId = item.id || item.exerciseId || `item-${index}`;
        const isDraggingThis = activeDragId === itemId;

        return (
          <ExerciseRow
            key={itemId}
            item={item}
            index={index}
            totalCount={exercises.length}
            isDraggingThis={isDraggingThis}
            isAnyDragging={isAnyDragging}
            onStartDrag={handleStartDrag}
            onSwap={handleSwap}
            onEndDrag={handleEndDrag}
            onPress={() => onPressItem(index)}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  cardContainer: {
    marginBottom: 10,
    zIndex: 1,
  },
  cardContainerDragging: {
    zIndex: 9999,
    elevation: 12,
  },
  exerciseCard: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderRadius: radii.card || 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  exerciseCardPressed: {
    backgroundColor: '#35302C',
  },
  exerciseCardDragging: {
    backgroundColor: '#3A251F', // Coral tint quente sem destaque âmbar (DESIGN.md)
    borderColor: colors.primary, // #FF7A59
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  exerciseCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  ordinalNumber: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 18,
    color: colors.primary,
    width: 26,
  },
  ordinalNumberDragging: {
    color: colors.primary,
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
  },
  exerciseNameText: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 2,
  },
  exerciseMetaText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  dragHandleTouchArea: {
    padding: 10,
    marginRight: -6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleBox: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  dragHandleBoxActive: {
    backgroundColor: 'rgba(255, 122, 89, 0.22)', // Fundo coral suave ao arrastar
  },
});
