import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { GripVertical } from 'lucide-react-native';
import { colors, fontFamilies, radii } from '../theme';
import { Text } from './Text';
import { triggerHaptic } from './haptics';
import { WorkoutExerciseForEdit } from '../db/workouts';

export interface ReorderableExerciseListProps {
  exercises: WorkoutExerciseForEdit[];
  onReorder: (reordered: WorkoutExerciseForEdit[]) => void;
  onPressItem: (index: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface RowItemProps {
  item: WorkoutExerciseForEdit;
  index: number;
  totalCount: number;
  isDragging: boolean;
  isHovered: boolean;
  draggedIndex: number | null;
  hoverIndex: number | null;
  itemHeight: number;
  panY: Animated.Value;
  panResponderHandlers: any;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}

const ExerciseRow: React.FC<RowItemProps> = ({
  item,
  index,
  isDragging,
  draggedIndex,
  hoverIndex,
  itemHeight,
  panY,
  panResponderHandlers,
  onPress,
  onLayout,
}) => {
  const shiftAnim = useRef(new Animated.Value(0)).current;

  // Calcula o deslocamento do item que não está sendo arrastado
  useEffect(() => {
    if (draggedIndex === null || hoverIndex === null || isDragging) {
      Animated.spring(shiftAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 160,
        friction: 14,
      }).start();
      return;
    }

    let targetShift = 0;
    if (draggedIndex < hoverIndex) {
      // Arrastando para baixo: itens entre draggedIndex+1 e hoverIndex sobem
      if (index > draggedIndex && index <= hoverIndex) {
        targetShift = -itemHeight;
      }
    } else if (draggedIndex > hoverIndex) {
      // Arrastando para cima: itens entre hoverIndex e draggedIndex-1 descem
      if (index >= hoverIndex && index < draggedIndex) {
        targetShift = itemHeight;
      }
    }

    Animated.spring(shiftAnim, {
      toValue: targetShift,
      useNativeDriver: true,
      tension: 160,
      friction: 14,
    }).start();
  }, [draggedIndex, hoverIndex, isDragging, index, itemHeight, shiftAnim]);

  const formattedIndex = String(index + 1).padStart(2, '0');

  // Estilo animado: o item arrastado segue o panY; os outros usam o shiftAnim
  const transformStyle = isDragging
    ? {
        transform: [{ translateY: panY }, { scale: 1.03 }],
      }
    : {
        transform: [{ translateY: shiftAnim }],
      };

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.cardContainer,
        transformStyle,
        isDragging && styles.cardContainerDragging,
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={draggedIndex !== null}
        style={({ pressed }) => [
          styles.exerciseCard,
          isDragging && styles.exerciseCardDragging,
          pressed && !isDragging && styles.exerciseCardPressed,
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
              isDragging && styles.ordinalNumberDragging,
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

        {/* Alça de Arrasto (Sem setas, 100% interativa) */}
        <View
          {...panResponderHandlers}
          style={styles.dragHandleTouchArea}
          accessibilityRole="button"
          accessibilityLabel={`Arrastar para reordenar ${item.name}`}
        >
          <View
            style={[
              styles.dragHandleBox,
              isDragging && styles.dragHandleBoxActive,
            ]}
          >
            <GripVertical
              size={20}
              color={isDragging ? colors.primary : colors.onSurfaceVariant}
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [itemHeight, setItemHeight] = useState(82); // Altura estimada do card + margem

  const panY = useRef(new Animated.Value(0)).current;
  const draggedIndexRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const itemHeightRef = useRef<number>(82);

  // Mantém refs atualizadas
  useEffect(() => {
    draggedIndexRef.current = draggedIndex;
  }, [draggedIndex]);

  useEffect(() => {
    hoverIndexRef.current = hoverIndex;
  }, [hoverIndex]);

  useEffect(() => {
    itemHeightRef.current = itemHeight;
  }, [itemHeight]);

  const handleCardLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    // Card height + margem inferior de 10px
    if (h > 50 && Math.abs(h + 10 - itemHeight) > 2) {
      setItemHeight(h + 10);
      itemHeightRef.current = h + 10;
    }
  };

  // Cria um PanResponder para um índice específico
  const createPanResponder = (index: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        draggedIndexRef.current = index;
        setDraggedIndex(index);
        hoverIndexRef.current = index;
        setHoverIndex(index);
        panY.setValue(0);
        onDragStart?.();
        triggerHaptic('medium');
      },
      onPanResponderMove: (_, gesture) => {
        panY.setValue(gesture.dy);
        const slotDelta = Math.round(gesture.dy / itemHeightRef.current);
        const nextHover = Math.max(0, Math.min(exercises.length - 1, index + slotDelta));
        if (nextHover !== hoverIndexRef.current) {
          hoverIndexRef.current = nextHover;
          setHoverIndex(nextHover);
          triggerHaptic('selection');
        }
      },
      onPanResponderRelease: () => {
        finishDrag(index);
      },
      onPanResponderTerminate: () => {
        finishDrag(index);
      },
    });
  };

  const finishDrag = (fromIndex: number) => {
    const toIndex = hoverIndexRef.current;
    if (toIndex === null || toIndex === undefined) {
      setDraggedIndex(null);
      setHoverIndex(null);
      panY.setValue(0);
      onDragEnd?.();
      return;
    }

    const targetOffset = (toIndex - fromIndex) * itemHeightRef.current;

    Animated.spring(panY, {
      toValue: targetOffset,
      useNativeDriver: true,
      tension: 160,
      friction: 14,
    }).start(() => {
      if (fromIndex !== toIndex) {
        const next = [...exercises];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        const reindexed = next.map((e, idx) => ({ ...e, position: idx }));
        onReorder(reindexed);
      }

      panY.setValue(0);
      draggedIndexRef.current = null;
      hoverIndexRef.current = null;
      setDraggedIndex(null);
      setHoverIndex(null);
      onDragEnd?.();
      triggerHaptic('success');
    });
  };

  return (
    <View style={styles.container}>
      {exercises.map((item, index) => {
        const isDragging = draggedIndex === index;
        const isHovered = hoverIndex === index;
        const responder = createPanResponder(index);

        return (
          <ExerciseRow
            key={item.id || `item-${index}`}
            item={item}
            index={index}
            totalCount={exercises.length}
            isDragging={isDragging}
            isHovered={isHovered}
            draggedIndex={draggedIndex}
            hoverIndex={hoverIndex}
            itemHeight={itemHeight}
            panY={panY}
            panResponderHandlers={responder.panHandlers}
            onPress={() => onPressItem(index)}
            onLayout={handleCardLayout}
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
    backgroundColor: '#3A251F', // Coral tint quente sem destaque âmbar
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
    padding: 8,
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
    backgroundColor: 'rgba(255, 122, 89, 0.2)', // Fundo coral suave ao arrastar
  },
});
