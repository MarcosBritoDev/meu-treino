import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Delete, X } from 'lucide-react-native';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { triggerHaptic } from './haptics';
import { parseNumber } from '../domain/sessionMath';

export interface QuickNumberPadSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  initialValue: string;
  type: 'weight' | 'reps';
  unit: string;
  onConfirm: (value: number) => void;
}

export const QuickNumberPadSheet: React.FC<QuickNumberPadSheetProps> = ({
  visible,
  onClose,
  title,
  initialValue,
  type,
  unit,
  onConfirm,
}) => {
  const [valStr, setValStr] = useState(initialValue);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);

  useEffect(() => {
    if (visible) {
      setValStr(initialValue || '0');
      setHasStartedTyping(false);
    }
  }, [visible, initialValue]);

  // Steppers rápidos dependendo do tipo
  const steppers = type === 'weight'
    ? [-5, -2.5, -1, 1, 2.5, 5]
    : [-5, -2, -1, 1, 2, 5];

  const handleStep = useCallback((delta: number) => {
    triggerHaptic('selection');
    const current = parseNumber(valStr) || 0;
    const updated = Math.max(0, Math.round((current + delta) * 10) / 10);
    // Para reps, sempre inteiro
    if (type === 'reps') {
      setValStr(String(Math.round(updated)));
    } else {
      setValStr(updated % 1 === 0 ? String(updated) : updated.toFixed(1));
    }
    setHasStartedTyping(true);
  }, [valStr, type]);

  const handleDigit = useCallback((digit: string) => {
    triggerHaptic('light');
    if (!hasStartedTyping) {
      // Primeira tecla substitui o valor padrão inicial
      setValStr(digit);
      setHasStartedTyping(true);
      return;
    }

    if (valStr.length >= 6) return; // Limite de dígitos razoável

    if (digit === '.') {
      if (type === 'reps') return; // Reps são inteiras
      if (!valStr.includes('.')) {
        setValStr(valStr === '' ? '0.' : valStr + '.');
      }
      return;
    }

    if (valStr === '0') {
      setValStr(digit);
    } else {
      setValStr(valStr + digit);
    }
  }, [valStr, hasStartedTyping, type]);

  const handleBackspace = useCallback(() => {
    triggerHaptic('light');
    setHasStartedTyping(true);
    if (valStr.length <= 1) {
      setValStr('0');
    } else {
      setValStr(valStr.slice(0, -1));
    }
  }, [valStr]);

  const handleClear = useCallback(() => {
    triggerHaptic('light');
    setValStr('0');
    setHasStartedTyping(true);
  }, []);

  const handleConfirm = useCallback(() => {
    const parsed = parseNumber(valStr);
    if (parsed !== null && parsed >= 0) {
      triggerHaptic('success');
      onConfirm(type === 'reps' ? Math.round(parsed) : parsed);
    }
    onClose();
  }, [valStr, type, onConfirm, onClose]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.sheetContent}>
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <Text variant="bodyLarge" style={styles.headerTitle}>
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Fechar teclado"
          >
            <X size={20} color="#8E8E93" />
          </Pressable>
        </View>

        {/* DISPLAY PRINCIPAL DO VALOR */}
        <View style={styles.displayRow}>
          <Text style={styles.displayValue}>
            {valStr || '0'}
          </Text>
          <Text style={styles.displayUnit}>
            {type === 'weight' ? unit : 'reps'}
          </Text>
        </View>

        {/* STEPPERS RÁPIDOS (CHIPS DE 1 TOQUE) */}
        <View style={styles.steppersRow}>
          {steppers.map((delta) => {
            const isPos = delta > 0;
            const label = isPos ? `+${delta}` : `${delta}`;
            return (
              <Pressable
                key={label}
                onPress={() => handleStep(delta)}
                style={({ pressed }) => [
                  styles.stepperChip,
                  isPos && styles.stepperChipPos,
                  pressed && styles.stepperChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Ajustar ${label} ${type === 'weight' ? unit : 'reps'}`}
              >
                <Text style={[styles.stepperText, isPos && styles.stepperTextPos]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* TECLADO NUMÉRICO (3 COLUNAS) */}
        <View style={styles.keypadGrid}>
          {/* Linha 1 */}
          <View style={styles.keypadRow}>
            <KeyButton digit="1" onPress={handleDigit} />
            <KeyButton digit="2" onPress={handleDigit} />
            <KeyButton digit="3" onPress={handleDigit} />
          </View>
          {/* Linha 2 */}
          <View style={styles.keypadRow}>
            <KeyButton digit="4" onPress={handleDigit} />
            <KeyButton digit="5" onPress={handleDigit} />
            <KeyButton digit="6" onPress={handleDigit} />
          </View>
          {/* Linha 3 */}
          <View style={styles.keypadRow}>
            <KeyButton digit="7" onPress={handleDigit} />
            <KeyButton digit="8" onPress={handleDigit} />
            <KeyButton digit="9" onPress={handleDigit} />
          </View>
          {/* Linha 4 */}
          <View style={styles.keypadRow}>
            {type === 'weight' ? (
              <KeyButton digit="." onPress={handleDigit} label="," />
            ) : (
              <Pressable
                onPress={handleClear}
                style={({ pressed }) => [styles.keyBtn, pressed && styles.keyBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Limpar valor"
              >
                <Text style={styles.keyBtnTextMuted}>C</Text>
              </Pressable>
            )}
            <KeyButton digit="0" onPress={handleDigit} />
            <Pressable
              onPress={handleBackspace}
              style={({ pressed }) => [styles.keyBtn, pressed && styles.keyBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Apagar dígito"
            >
              <Delete size={20} color="#E5E5EA" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* BOTÃO PRINCIPAL CONFIRMAR (DOURADO STITCH) */}
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Confirmar alteração"
        >
          <Text style={styles.confirmBtnText}>Confirmar</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
};

interface KeyButtonProps {
  digit: string;
  onPress: (d: string) => void;
  label?: string;
}

const KeyButton: React.FC<KeyButtonProps> = ({ digit, onPress, label }) => {
  return (
    <Pressable
      onPress={() => onPress(digit)}
      style={({ pressed }) => [styles.keyBtn, pressed && styles.keyBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Dígito ${digit}`}
    >
      <Text style={styles.keyBtnText}>{label || digit}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    paddingTop: 4,
    paddingBottom: 8,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 14,
    color: '#B7ADA3',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  displayValue: {
    fontSize: 42,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  displayUnit: {
    fontSize: 20,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: '#F5A623', // Gold Stitch
  },
  steppersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  stepperChip: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#242426',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  stepperChipPos: {
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
    borderColor: 'rgba(245, 166, 35, 0.25)',
  },
  stepperChipPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
  stepperText: {
    fontSize: 13,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  stepperTextPos: {
    color: '#F5A623',
  },
  keypadGrid: {
    gap: 8,
    paddingTop: 4,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#242426',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBtnPressed: {
    backgroundColor: '#323236',
    transform: [{ scale: 0.97 }],
  },
  keyBtnText: {
    fontSize: 22,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  keyBtnTextMuted: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '600',
    color: '#8E8E93',
  },
  confirmBtn: {
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: '#F5A623', // Gold Stitch
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  confirmBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  confirmBtnText: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: '#000000',
  },
});
