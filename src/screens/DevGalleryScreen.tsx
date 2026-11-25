import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import {
  ScreenHeader,
  Card,
  Text,
  Button,
  Chip,
  SegmentedControl,
  Stepper,
  TextField,
  BottomSheet,
  ConfirmModal,
  Toast,
  PRBadge,
  EmptyState,
} from '../ui';
import { Dumbbell, Info } from 'lucide-react-native';

export const DevGalleryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Estados locais para interatividade na galeria
  const [chipSelected, setChipSelected] = useState(true);
  const [segmentValue, setSegmentValue] = useState<'A' | 'B' | 'C'>('A');
  const [stepperValue, setStepperValue] = useState(82.5);
  const [textInputVal, setTextInputVal] = useState('Supino reto');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('Série concluída com sucesso');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Galeria de componentes"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Botões em todos os estados */}
        <Card variant="surface" style={styles.sectionCard}>
          <Text variant="headline" style={styles.sectionTitle}>
            1. Buttons (Default, Pressed, Disabled)
          </Text>

          <Text variant="bodySmall" color="secondary">
            Primary (56px pílula coral)
          </Text>
          <Button
            title="Botão primário ativo"
            variant="primary"
            onPress={() => {}}
          />
          <Button
            title="Botão primário desabilitado"
            variant="primary"
            disabled
            onPress={() => {}}
          />

          <Text variant="bodySmall" color="secondary" style={styles.subHeading}>
            Large (64px pílula coral para treino ativo)
          </Text>
          <Button
            title="Concluir treino"
            variant="large"
            onPress={() => {}}
          />

          <Text variant="bodySmall" color="secondary" style={styles.subHeading}>
            Secondary (pílula #2D2925)
          </Text>
          <Button
            title="Botão secundário ativo"
            variant="secondary"
            onPress={() => {}}
          />
          <Button
            title="Botão secundário desabilitado"
            variant="secondary"
            disabled
            onPress={() => {}}
          />

          <Text variant="bodySmall" color="secondary" style={styles.subHeading}>
            Danger (vermelho suave #FF6B6B)
          </Text>
          <Button
            title="Descartar treino"
            variant="danger"
            onPress={() => {}}
          />

          <Text variant="bodySmall" color="secondary" style={styles.subHeading}>
            Text (sem fundo)
          </Text>
          <Button
            title="Ação em texto"
            variant="text"
            onPress={() => {}}
          />
        </Card>

        {/* 2. Chips e SegmentedControl */}
        <Card variant="surface" style={styles.sectionCard}>
          <Text variant="headline" style={styles.sectionTitle}>
            2. Chip e SegmentedControl
          </Text>

          <View style={styles.row}>
            <Chip
              label="Selecionado"
              selected={chipSelected}
              onPress={() => setChipSelected(!chipSelected)}
            />
            <Chip
              label="Não selecionado"
              selected={false}
              onPress={() => {}}
            />
            <Chip
              label="Desabilitado"
              disabled
              onPress={() => {}}
            />
          </View>

          <Text variant="bodySmall" color="secondary" style={styles.subHeading}>
            SegmentedControl (pílula, selecionado coral)
          </Text>
          <SegmentedControl
            options={[
              { label: 'Série 1', value: 'A' },
              { label: 'Série 2', value: 'B' },
              { label: 'Série 3', value: 'C' },
            ]}
            value={segmentValue}
            onChange={(val) => setSegmentValue(val)}
          />
        </Card>

        {/* 3. Stepper com toque e repetição contínua */}
        <Card variant="surface" style={styles.sectionCard}>
          <Text variant="headline" style={styles.sectionTitle}>
            3. Stepper (botões 48px e Outfit grande)
          </Text>
          <Text variant="bodySmall" color="secondary">
            Pressione ou segure para repetir incrementos rapidamente com haptics:
          </Text>
          <Stepper
            value={stepperValue}
            step={2.5}
            min={0}
            max={300}
            unit="kg"
            onChange={(val) => setStepperValue(val)}
          />
        </Card>

        {/* 4. Cartões e variantes */}
        <Card variant="surface" style={styles.sectionCard}>
          <Text variant="headline" style={styles.sectionTitle}>
            4. Cards (raio 24px, padding 16-20px)
          </Text>
          <Card variant="surface">
            <Text variant="headline" style={styles.cardTitle}>
              Card Surface (#23201D)
            </Text>
            <Text variant="bodySmall" color="secondary">
              Nível padrão para agrupamento de informações.
            </Text>
          </Card>

          <Card variant="high">
            <Text variant="headline" style={styles.cardTitle}>
              Card High (#2D2925)
            </Text>
            <Text variant="bodySmall" color="secondary">
              Nível elevado para campos secundários e contraste.
            </Text>
          </Card>

          <Card variant="highlight">
            <Text variant="headline" style={styles.cardTitle}>
              Card Highlight (#3A251F)
            </Text>
            <Text variant="bodySmall" color="coral">
              Tint coral suave para timers e avisos essenciais.
            </Text>
          </Card>
        </Card>

        {/* 5. TextField */}
        <Card variant="surface" style={styles.sectionCard}>
          <Text variant="headline" style={styles.sectionTitle}>
            5. TextField (raio 16px, fundo #38332F)
          </Text>
          <TextField
            label="Nome do exercício"
            value={textInputVal}
            onChangeText={setTextInputVal}
            placeholder="Digite o nome..."
            showCounter
            maxLength={30}
          />

          <TextField
            label="Campo com erro"
            value=""
            error="O valor da carga deve ser superior a zero"
            placeholder="0 kg"
          />
        </Card>

        {/* 6. PRBadge */}
        <Card variant="surface" style={styles.sectionCard}>
          <Text variant="headline" style={styles.sectionTitle}>
            6. PRBadge (âmbar #FFC46B somente para PR)
          </Text>
          <View style={styles.row}>
            <PRBadge label="Recorde de carga" />
            <PRBadge label="PR de volume" />
          </View>
        </Card>

        {/* 7. BottomSheet e Modais */}
        <Card variant="surface" style={styles.sectionCard}>
          <Text variant="headline" style={styles.sectionTitle}>
            7. BottomSheet e ConfirmModal
          </Text>
          <Button
            title="Abrir BottomSheet"
            variant="secondary"
            onPress={() => setSheetOpen(true)}
          />
          <Button
            title="Abrir ConfirmModal"
            variant="secondary"
            onPress={() => setConfirmOpen(true)}
          />
        </Card>

        {/* 8. Toast Notification (4 segundos, role=status) */}
        <Card variant="surface" style={styles.sectionCard}>
          <Text variant="headline" style={styles.sectionTitle}>
            8. Toast (inferior, 4 s, role=status)
          </Text>
          <Button
            title="Disparar Toast de sucesso"
            variant="primary"
            onPress={() => {
              setToastMessage('Série concluída com sucesso!');
              setToastVisible(true);
            }}
          />
        </Card>

        {/* 9. EmptyState */}
        <Card variant="surface" style={styles.sectionCard}>
          <Text variant="headline" style={styles.sectionTitle}>
            9. EmptyState
          </Text>
          <EmptyState
            title="Título amigável de estado vazio"
            description="Explicação clara com até duas ações recomendadas na thumb zone."
            icon={<Dumbbell size={32} color={colors.primary} strokeWidth={1.75} />}
            primaryAction={{
              title: 'Ação primária',
              onPress: () => {},
            }}
            secondaryAction={{
              title: 'Ação secundária',
              onPress: () => {},
            }}
          />
        </Card>
      </ScrollView>

      {/* BottomSheet modal */}
      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Painel de opções"
      >
        <Text variant="bodyMedium" color="secondary" style={styles.sheetBody}>
          Este BottomSheet possui raio de 28px no topo, overlay preto de 65% e alça de arrastar para fechar suavemente.
        </Text>
        <Button
          title="Fechar painel"
          variant="primary"
          onPress={() => setSheetOpen(false)}
        />
      </BottomSheet>

      {/* ConfirmModal */}
      <ConfirmModal
        visible={confirmOpen}
        title="Descartar alterações?"
        description="As séries realizadas nesta sessão serão perdidas. Esta ação não poderá ser desfeita."
        confirmLabel="Descartar"
        isDanger
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
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
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl * 2,
    gap: spacing.gutter,
  },
  sectionCard: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  subHeading: {
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  sheetBody: {
    marginBottom: spacing.md,
  },
});
