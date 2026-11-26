import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { triggerHaptic } from './haptics';
import { formatWeight, Unit, SetType, canAddDropAtEnd } from '../domain/sessionMath';

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
      badgeColor: '#FF7A59',
      badgeBorder: 'rgba(255, 122, 89, 0.35)',
      title: 'Aquecimento',
      desc: '8–12 reps · Sem esforço',
    },
    {
      key: 'normal',
      badge: 'N',
      badgeBg: '#38332F',
      badgeColor: '#F5EFE8',
      badgeBorder: '#4D463E',
      title: 'Normal',
      desc: 'Faixa padrão do exercício',
    },
    {
      key: 'rpe',
      badge: 'RPE',
      badgeBg: 'rgba(255, 122, 89, 0.15)',
      badgeColor: '#FF7A59',
      badgeBorder: 'rgba(255, 122, 89, 0.4)',
      title: 'Por RPE',
      desc: 'Série normal · Meta RPE 8',
    },
    {
      key: 'rir',
      badge: 'RIR',
      badgeBg: 'rgba(56, 189, 248, 0.15)',
      badgeColor: '#38BDF8',
      badgeBorder: 'rgba(56, 189, 248, 0.4)',
      title: 'Por RIR',
      desc: 'Série normal · Meta 2 RIR',
    },
    {
      key: 'failure',
      badge: 'F',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      badgeColor: '#FF6B6B',
      badgeBorder: 'rgba(239, 68, 68, 0.4)',
      title: 'Falha',
      desc: 'Até a falha · Conta p/ PR',
    },
    {
      key: 'drop',
      badge: 'D',
      badgeBg: canDrop ? 'rgba(192, 132, 252, 0.15)' : 'rgba(192, 132, 252, 0.05)',
      badgeColor: canDrop ? '#C084FC' : '#7D619B',
      badgeBorder: canDrop ? 'rgba(192, 132, 252, 0.4)' : 'rgba(192, 132, 252, 0.15)',
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
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheetContainer}>
          {/* Alça do sheet */}
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
            >
              <X size={18} color="#A1A1A6" />
            </Pressable>
          </View>

          {/* Grade 2x3 */}
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
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
    backgroundColor: '#23201D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#2D2925',
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 12,
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
  },
  headerTitle: {
    fontSize: 17,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  optionCard: {
    backgroundColor: '#2D2925',
    borderWidth: 1,
    borderColor: '#38332F',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 64,
  },
  optionCardPressed: {
    borderColor: '#FF7A59',
    backgroundColor: '#38332F',
  },
  optionCardDisabled: {
    opacity: 0.45,
    borderColor: '#23201D',
    backgroundColor: '#1F1B19',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5EFE8',
    marginBottom: 2,
  },
  optionTitleDisabled: {
    color: '#7D746B',
  },
  optionDesc: {
    fontSize: 11,
    color: '#B7ADA3',
    lineHeight: 14,
  },
  optionDescDisabled: {
    color: '#7D746B',
  },
});
