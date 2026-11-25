import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Trash2,
  Dumbbell,
  Play,
  RotateCcw,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Toast } from '../ui/Toast';
import { triggerHaptic } from '../ui/haptics';
import { getExpoDb } from '../db/client';

type RouteParams = RouteProp<RootStackParamList, 'ActiveSession'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SessionDetail {
  id: string;
  nameSnapshot: string;
  startedAt: number;
  status: string;
  workoutId: string | null;
}

interface SessionExerciseItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  targetSets: number;
  repMin: number;
  repMax: number;
  restS: number;
}

export const ActiveSessionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const sessionId = route.params?.sessionId;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [exercises, setExercises] = useState<SessionExerciseItem[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [discardModalVisible, setDiscardModalVisible] = useState(false);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Carrega sessão do banco
  const loadSession = useCallback(() => {
    if (!sessionId) return;
    try {
      const rawDb = getExpoDb();
      const sessRows = rawDb.getAllSync<SessionDetail>(
        `SELECT id, name_snapshot AS nameSnapshot, started_at AS startedAt, status, workout_id AS workoutId
         FROM sessions
         WHERE id = ?`,
        [sessionId]
      );

      if (sessRows.length > 0) {
        setSession(sessRows[0]);

        const exRows = rawDb.getAllSync<SessionExerciseItem>(
          `SELECT se.id, se.exercise_id AS exerciseId, e.name AS exerciseName,
                  e.muscle_group AS muscleGroup, e.equipment, se.target_sets AS targetSets,
                  se.rep_min AS repMin, se.rep_max AS repMax, se.rest_s AS restS
           FROM session_exercises se
           JOIN exercises e ON se.exercise_id = e.id
           WHERE se.session_id = ?
           ORDER BY se.position ASC`,
          [sessionId]
        );
        setExercises(exRows);
      }
    } catch (err) {
      console.warn('Erro ao carregar sessão ativa:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Timer contínuo da sessão
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;

    const updateTimer = () => {
      const diffS = Math.floor((Date.now() - session.startedAt) / 1000);
      setElapsedSeconds(Math.max(0, diffS));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Formata o cronômetro MM:SS ou HH:MM:SS
  const formattedTimer = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }, [elapsedSeconds]);

  // Descartar sessão
  const handleConfirmDiscard = () => {
    if (!sessionId) return;
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(
        `UPDATE sessions SET status = 'discarded', ended_at = ? WHERE id = ?`,
        [Date.now(), sessionId]
      );
      triggerHaptic('medium');
      setDiscardModalVisible(false);
      navigation.goBack();
    } catch (err) {
      console.warn('Erro ao descartar sessão:', err);
    }
  };

  // Concluir sessão
  const handleConfirmFinish = () => {
    if (!sessionId) return;
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(
        `UPDATE sessions SET status = 'completed', ended_at = ? WHERE id = ?`,
        [Date.now(), sessionId]
      );
      triggerHaptic('success');
      setFinishModalVisible(false);
      navigation.goBack();
    } catch (err) {
      console.warn('Erro ao concluir sessão:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <Pressable
          onPress={() => setDiscardModalVisible(true)}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar ou descartar treino"
        >
          <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text variant="headline" style={styles.sessionTitle} numberOfLines={1}>
            {session?.nameSnapshot || 'Treino em andamento'}
          </Text>
          <View style={styles.timerBadge}>
            <Clock size={13} color={colors.primary} strokeWidth={2.2} />
            <Text variant="labelSmall" style={styles.timerText}>
              {formattedTimer}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setDiscardModalVisible(true)}
          style={styles.discardHeaderButton}
          accessibilityRole="button"
          accessibilityLabel="Descartar treino"
        >
          <Trash2 size={20} color={colors.error} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* SELO DE STATUS EM ANDAMENTO */}
        <View style={styles.statusBanner}>
          <View style={styles.pulsingDot} />
          <Text variant="bodySmall" style={styles.statusBannerText}>
            Treino ativo • Registre suas séries e descansos
          </Text>
        </View>

        {/* LISTA DE EXERCÍCIOS DA SESSÃO */}
        <View style={styles.exerciseSection}>
          <Text variant="labelSmall" style={styles.sectionTitle}>
            Exercícios ({exercises.length})
          </Text>

          {exercises.map((ex, idx) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseCardLeft}>
                <Text variant="displayMedium" style={styles.ordinalNumber}>
                  {String(idx + 1).padStart(2, '0')}
                </Text>
                <View style={styles.exerciseInfo}>
                  <Text variant="bodyMedium" style={styles.exerciseNameText}>
                    {ex.exerciseName}
                  </Text>
                  <Text variant="bodySmall" style={styles.exerciseMetaText}>
                    {ex.targetSets} séries · {ex.repMin}-{ex.repMax} reps · {ex.restS}s descanso
                  </Text>
                  <Text variant="labelSmall" style={styles.muscleText}>
                    {ex.muscleGroup} • {ex.equipment}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* RODAPÉ FIXO COM AÇÃO DE CONCLUIR */}
      <View style={styles.bottomBar}>
        <Button
          title="Concluir treino"
          variant="primary"
          icon={<CheckCircle size={20} color={colors.onPrimary} strokeWidth={2.4} />}
          onPress={() => setFinishModalVisible(true)}
          style={styles.finishButton}
        />
      </View>

      {/* MODAL DE CONFIRMAÇÃO PARA DESCARTAR */}
      <ConfirmModal
        visible={discardModalVisible}
        title="Descartar treino em andamento?"
        description="O progresso desta sessão não será salvo no histórico."
        confirmLabel="Descartar"
        cancelLabel="Continuar treinando"
        isDanger={true}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setDiscardModalVisible(false)}
      />

      {/* MODAL DE CONFIRMAÇÃO PARA CONCLUIR */}
      <ConfirmModal
        visible={finishModalVisible}
        title="Concluir este treino?"
        description="Seu treino será registrado no histórico e os recordes atualizados."
        confirmLabel="Salvar e concluir"
        cancelLabel="Voltar"
        isDanger={false}
        onConfirm={handleConfirmFinish}
        onCancel={() => setFinishModalVisible(false)}
      />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backButton: {
    padding: 8,
    borderRadius: radii.pill,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  sessionTitle: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  timerText: {
    color: colors.primary,
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 12,
  },
  discardHeaderButton: {
    padding: 8,
    borderRadius: radii.pill,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: 20,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusBannerText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  exerciseSection: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exerciseCard: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  exerciseCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ordinalNumber: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 18,
    color: colors.primary,
    width: 26,
  },
  exerciseInfo: {
    flex: 1,
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
    marginBottom: 2,
  },
  muscleText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  finishButton: {
    width: '100%',
  },
});
