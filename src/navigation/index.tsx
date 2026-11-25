import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from './types';
import { TabBar } from '../ui/TabBar';
import { HomeScreen } from '../screens/HomeScreen';
import { WorkoutsScreen } from '../screens/WorkoutsScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { BackupScreen } from '../screens/BackupScreen';
import { DevGalleryScreen } from '../screens/DevGalleryScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { NewExerciseScreen } from '../screens/NewExerciseScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';
import { GroupDetailScreen } from '../screens/GroupDetailScreen';
import { EditWorkoutScreen } from '../screens/EditWorkoutScreen';
import { colors } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="Treinos" component={WorkoutsScreen} options={{ title: 'Treinos' }} />
      <Tab.Screen name="Biblioteca" component={LibraryScreen} options={{ title: 'Biblioteca' }} />
      <Tab.Screen name="Progresso" component={ProgressScreen} options={{ title: 'Progresso' }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { onboarded } = useSettingsStore();

  return (
    <Stack.Navigator
      initialRouteName={onboarded ? 'MainTabs' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen
        name="Ajustes"
        component={SettingsScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Backup"
        component={BackupScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="DevGallery"
        component={DevGalleryScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="NewExercise"
        component={NewExerciseScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="EditWorkout"
        component={EditWorkoutScreen}
        options={{
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
}
