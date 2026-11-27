import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { triggerHaptic } from './haptics';
import { formatWeight, Unit, SetType, canAddDropAtEnd } from '../domain/sessionMath';
import { colors, fontFamilies, radii, spacing } from '../theme';

export type SetTypeOptionKey = 'warmup' | 'normal' | 'rpe' | 'rir' | 'failure' | 'drop';

export interface SetTypeSheetProps {
  visible: boolean;
  mode?: 'preview' | 'active';
  onClose: () => void;
  onSelect: (typeKey: SetTypeOptionKey) => void;
  suggestedDropKg?: number | null;
  unit?: Unit;
  sets?: Array<{ type?: SetType | string; isWarmup?: boolean }>;
}

export const SetTypeSheet: React.FC<SetTypeSheetProps> = ({
  visible,
  mode = 'preview',
  onClose,
  onSelect,
  suggestedDropKg,
  unit = 'kg',
  sets,
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const canDrop = sets !== undefined ? canAddDropAtEnd(sets) : true;

  const dropDesc = !canDrop
    ? 'Adicione uma série antes'
    : mode === 'active'
      ? suggestedDropKg
        ? `Até a falha · Sugestão ${formatWeight(suggestedDropKg, unit)} ${unit} (-20%)`
        : 'Até a falha · -20% da anterior'
      : 'Até a falha · -20% no treino';

  const options: Array<{
    key: SetTypeOptionKey;
    badge: string;
    badgeBg: string;
    badgeColor: string;
    badgeBorder: string;
    title: string;
    desc: string;
    disabled?: boolean;
  }> = [
    {
      key: 'warmup',
      badge: 'A',
      badgeBg: 'rgba(255, 122, 89, 0.12)',
      badgeColor: colors.primary, // #FF7A59
      badgeBorder: 'rgba(255, 122, 89, 0.35)',
      title: 'Aquecimento',
      desc: '8–12 reps · Sem esforço',
    },
    {
      key: 'normal',
      badge: 'N',
      badgeBg: colors.surfaceContainerHighest, // #38332F
      badgeColor: colors.onSurface, // #F5EFE8
      badgeBorder: '#4D463E',
      title: 'Normal',
      desc: 'Faixa padrão do exercício',
    },
    {
      key: 'rpe',
      badge: 'RPE',
      badgeBg: 'rgba(255, 122, 89, 0.15)',
      badgeColor: colors.primary, // #FF7A59
      badgeBorder: 'rgba(255, 122, 89, 0.4)',
      title: 'Por RPE',
      desc: 'Série normal · Meta RPE 8',
    },
    {
      key: 'rir',
      badge: 'RIR',
      badgeBg: 'rgba(123, 201, 143, 0.15)',
      badgeColor: colors.success, // #7BC98F (Warm mint green do DESIGN.md em substituição ao azul céu proibido)
      badgeBorder: 'rgba(123, 201, 143, 0.4)',
      title: 'Por RIR',
      desc: 'Série normal · Meta 2 RIR',
    },
    {
      key: 'failure',
      badge: 'F',
      badgeBg: 'rgba(255, 107, 107, 0.15)',
      badgeColor: colors.error, // #FF6B6B
      badgeBorder: 'rgba(255, 107, 107, 0.4)',
      title: 'Falha',
      desc: 'Até a falha · Conta p/ PR',
    },
    {
      key: 'drop',
      badge: 'D',
      badgeBg: canDrop ? 'rgba(255, 122, 89, 0.15)' : 'rgba(255, 122, 89, 0.05)',
      badgeColor: canDrop ? colors.onPrimaryContainer : colors.textMuted, // #FFB4A0 / #7D746B (Tom pêssego coral do DESIGN.md em substituição ao roxo frio)
      badgeBorder: canDrop ? 'rgba(255, 122, 89, 0.4)' : 'rgba(255, 122, 89, 0.15)',
      title: 'Drop',
      desc: dropDesc,
      disabled: !canDrop,
    },
  ];

  const handleSelect = (key: SetTypeOptionKey) => {
    triggerHaptic('selection');
    onSelect(key);
    onClose();
  };

  const cardWidth = (width - 40 - 10) / 2; // 2 colunas com margens

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
              { paddingBottom: Math.max(spacing.xl, insets.bottom + 16) },
            ]}
          >
            {/* Alça central de arrasto */}
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>

            {/* Cabeçalho */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Adicionar série</Text>
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

            {/* Grade 2x3 rápida de 1 toque */}
            <View style={styles.grid}>
              {options.map((opt) => {
                const isDisabled = Boolean(opt.disabled);
                return (
                  <Pressable
                    key={opt.key}
                    disabled={isDisabled}
                    onPress={() => !isDisabled && handleSelect(opt.key)}
                    style={({ pressed }) => [
                      styles.optionCard,
                      { width: cardWidth },
                      isDisabled && styles.optionCardDisabled,
                      pressed && !isDisabled && styles.optionCardPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isDisabled }}
                    accessibilityLabel={`${opt.title}, ${opt.desc}`}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: opt.badgeBg,
                          borderColor: opt.badgeBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: opt.badgeColor }]}>
                        {opt.badge}
                      </Text>
                    </View>

                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionTitle,
                          isDisabled && styles.optionTitleDisabled,
                        ]}
                        numberOfLines={1}
                      >
                        {opt.title}
                      </Text>
                      <Text
                        style={[
                          styles.optionDesc,
                          isDisabled && styles.optionDescDisabled,
                        ]}
                        numberOfLines={2}
                      >
                        {opt.desc}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
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
    width: spacing.touchTargetMin, // 48dp touch target
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  optionCard: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    borderRadius: radii.input, // 16px
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 64, // Touch target generoso
  },
  optionCardPressed: {
    borderColor: colors.primary, // #FF7A59
    backgroundColor: colors.surfaceContainerHighest, // #38332F
  },
  optionCardDisabled: {
    opacity: 0.45,
    borderColor: colors.surfaceContainer,
    backgroundColor: colors.surfaceContainerLow,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm, // 8px
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    minWidth: 26,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fontFamilies.outfitBold,
    fontVariant: ['tabular-nums'],
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
    marginBottom: 2,
  },
  optionTitleDisabled: {
    color: colors.textMuted,
  },
  optionDesc: {
    fontSize: 11,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.onSurfaceVariant,
    lineHeight: 15,
    fontVariant: ['tabular-nums'],
  },
  optionDescDisabled: {
    color: colors.textMuted,
  },
});
