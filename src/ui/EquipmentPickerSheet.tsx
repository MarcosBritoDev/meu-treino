import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Dumbbell,
  Boxes,
  Cable,
  User,
  Sliders,
  CircleDot,
  ShieldCheck,
  HeartPulse,
  Ellipsis,
  Check,
  Layers,
} from 'lucide-react-native';
import { triggerHaptic } from './haptics';
import {
  EQUIPMENTS,
  Equipment,
  normalizeEquipmentName,
} from '../domain/exerciseCatalog';
import { colors, fontFamilies, radii, spacing } from '../theme';

export interface EquipmentPickerSheetProps {
  visible: boolean;
  mode?: 'select' | 'filter';
  selectedEquipment?: string | null;
  onSelect: (equipment: Equipment | 'Todos') => void;
  onClose: () => void;
}

interface EquipmentOption {
  id: Equipment;
  title: string;
  hint: string;
  IconComponent: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  {
    id: 'Barra',
    title: 'Barra',
    hint: 'Olímpica, reta ou W',
    IconComponent: Dumbbell,
  },
  {
    id: 'Halteres',
    title: 'Halteres',
    hint: 'Peso por halter (2×)',
    IconComponent: Dumbbell,
  },
  {
    id: 'Máquina',
    title: 'Máquina',
    hint: 'Placas ou carga guiada',
    IconComponent: Boxes,
  },
  {
    id: 'Cabo / Polia',
    title: 'Cabo / Polia',
    hint: 'Cabo ajustável ou polia',
    IconComponent: Cable,
  },
  {
    id: 'Peso corporal',
    title: 'Peso corporal',
    hint: 'Carga do próprio corpo',
    IconComponent: User,
  },
  {
    id: 'Smith',
    title: 'Smith',
    hint: 'Barra guiada Smith',
    IconComponent: Sliders,
  },
  {
    id: 'Kettlebell',
    title: 'Kettlebell',
    hint: 'Peso esférico de alça',
    IconComponent: CircleDot,
  },
  {
    id: 'Barra de segurança',
    title: 'Barra de segurança',
    hint: 'Safety squat bar',
    IconComponent: ShieldCheck,
  },
  {
    id: 'Cardio',
    title: 'Cardio',
    hint: 'Ergômetro ou aeróbico',
    IconComponent: HeartPulse,
  },
  {
    id: 'Outro',
    title: 'Outro',
    hint: 'Acessórios e diversos',
    IconComponent: Ellipsis,
  },
];

export const EquipmentPickerSheet: React.FC<EquipmentPickerSheetProps> = ({
  visible,
  mode = 'select',
  selectedEquipment,
  onSelect,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const handleSelect = (eq: Equipment | 'Todos') => {
    triggerHaptic('selection');
    onSelect(eq);
    onClose();
  };

  const cardWidth = (width - 40 - 10) / 2; // 2 colunas com margens de 20px e gap de 10px

  const isFilterAllSelected =
    mode === 'filter' &&
    (!selectedEquipment ||
      selectedEquipment.trim() === '' ||
      selectedEquipment.toLowerCase() === 'todos');

  const normalizedSelected = selectedEquipment ? normalizeEquipmentName(selectedEquipment) : null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Fundo escuro 65% que fecha ao toque */}
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
              maxHeight: height * 0.88,
              paddingBottom: Math.max(spacing.xl, insets.bottom + 16),
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
              {mode === 'filter' ? 'Filtrar por equipamento' : 'Equipamento'}
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
            bounces={false}
          >
            {/* No modo 'filter', botão "Todos os equipamentos" no topo */}
            {mode === 'filter' && (
              <Pressable
                onPress={() => handleSelect('Todos')}
                style={[
                  styles.filterAllBtn,
                  isFilterAllSelected && styles.filterAllBtnSelected,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isFilterAllSelected }}
                accessibilityLabel="Todos os equipamentos"
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <View style={styles.filterAllLeft}>
                  <Layers
                    size={20}
                    color={isFilterAllSelected ? colors.primary : colors.onSurfaceVariant}
                    strokeWidth={1.75}
                  />
                  <Text
                    style={[
                      styles.filterAllText,
                      isFilterAllSelected && styles.filterAllTextSelected,
                    ]}
                  >
                    Todos os equipamentos
                  </Text>
                </View>
                {isFilterAllSelected && (
                  <View style={styles.selectedBadge}>
                    <Check size={16} color={colors.primary} strokeWidth={2.5} />
                  </View>
                )}
              </Pressable>
            )}

            {/* Grade 2 colunas com os 10 equipamentos */}
            <View style={styles.grid}>
              {EQUIPMENT_OPTIONS.map((item) => {
                const isSelected = normalizedSelected === item.id;
                const { IconComponent } = item;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelect(item.id)}
                    style={({ pressed }) => [
                      styles.card,
                      { width: cardWidth },
                      isSelected && styles.cardSelected,
                      pressed && styles.cardPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${item.title}, ${item.hint}`}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View
                        style={[
                          styles.iconContainer,
                          isSelected && styles.iconContainerSelected,
                        ]}
                      >
                        <IconComponent
                          size={18}
                          color={isSelected ? colors.primary : colors.onSurfaceVariant}
                          strokeWidth={1.75}
                        />
                      </View>
                      {isSelected && (
                        <Check size={16} color={colors.primary} strokeWidth={2.5} />
                      )}
                    </View>

                    <View style={styles.cardTextContent}>
                      <Text
                        style={[
                          styles.cardTitle,
                          isSelected && styles.cardTitleSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          styles.cardHint,
                          isSelected && styles.cardHintSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {item.hint}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: colors.surfaceContainer, // #23201D
    borderTopLeftRadius: radii.sheet, // 28px
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    paddingHorizontal: spacing.margin, // 20px
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
    paddingBottom: spacing.sm,
  },
  filterAllBtn: {
    minHeight: spacing.touchTargetMin, // 48dp
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    borderRadius: radii.input, // 16px
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterAllBtnSelected: {
    backgroundColor: colors.primaryContainer, // #3A251F
    borderColor: colors.primary, // #FF7A59
  },
  filterAllLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterAllText: {
    fontSize: 15,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
  },
  filterAllTextSelected: {
    color: colors.primary,
    fontFamily: fontFamilies.outfitBold,
  },
  selectedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    borderRadius: radii.input, // 16px
    padding: 12,
    minHeight: 56, // Touch target generoso
    justifyContent: 'space-between',
  },
  cardSelected: {
    backgroundColor: colors.primaryContainer, // #3A251F
    borderColor: colors.primary, // #FF7A59
  },
  cardPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerHighest,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSelected: {
    backgroundColor: 'rgba(255, 122, 89, 0.2)',
  },
  cardTextContent: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
  },
  cardTitleSelected: {
    color: colors.primary,
    fontFamily: fontFamilies.outfitBold,
  },
  cardHint: {
    fontSize: 11,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.textMuted,
    lineHeight: 15,
  },
  cardHintSelected: {
    color: colors.onPrimaryContainer, // #FFB4A0
  },
});
