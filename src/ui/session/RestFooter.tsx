import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from './tokens';
import { formatClock } from '../../domain/sessionMath';

interface Props {
  remainingS: number;
  totalS: number;
  onAdjust: (deltaS: number) => void;
  onSkip: () => void;
  /** Distância da borda inferior (safe area + TabBar, se houver). */
  bottomOffset?: number;
}

/** Rodapé fixo do descanso: −15 s · 01:22 · +30 s · Pular. Renderize só enquanto houver descanso. */
export function RestFooter({ remainingS, totalS, onAdjust, onSkip, bottomOffset = 12 }: Props) {
  const progress = totalS > 0 ? Math.min(1, Math.max(0, (totalS - remainingS) / totalS)) : 0;

  return (
    <View style={[s.wrap, { bottom: bottomOffset }]} accessibilityLiveRegion="polite">
      <View style={s.row}>
        <Pressable style={s.adj} onPress={() => onAdjust(-15)} accessibilityRole="button" accessibilityLabel="Menos 15 segundos">
          <Text style={s.adjText} numberOfLines={1}>−15 s</Text>
        </Pressable>

        <Text style={s.time} accessibilityLabel={`Descanso, faltam ${remainingS} segundos`}>
          {formatClock(remainingS)}
        </Text>

        <Pressable style={s.adj} onPress={() => onAdjust(30)} accessibilityRole="button" accessibilityLabel="Mais 30 segundos">
          <Text style={s.adjText} numberOfLines={1}>+30 s</Text>
        </Pressable>

        <Pressable style={s.skip} onPress={onSkip} accessibilityRole="button" accessibilityLabel="Pular descanso">
          <Text style={s.skipText} numberOfLines={1}>Pular</Text>
        </Pressable>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 20, right: 20,
    backgroundColor: '#3A251F', borderRadius: 24, borderWidth: 1, borderColor: C.primary,
    paddingTop: 10, paddingBottom: 12, paddingHorizontal: 12,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 8 },
  adj: { minWidth: 56, height: 48, borderRadius: 24, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  adjText: { fontFamily: F.number, fontSize: 13, color: C.text, fontVariant: ['tabular-nums'] },
  time: { flex: 1, textAlign: 'center', fontFamily: F.numberBold, fontSize: 28, lineHeight: 34, color: C.text, fontVariant: ['tabular-nums'] },
  skip: { minWidth: 70, height: 48, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  skipText: { fontFamily: F.bodyMedium, fontSize: 14, color: C.onPrimary },
  track: { height: 4, borderRadius: 2, backgroundColor: C.border, marginTop: 10, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: C.primary },
});
