export interface ActiveSessionData {
  id: string;
  name: string;
  startedAt: number;
  workoutId: string | null;
  elapsedSeconds: number;
}

export interface RecommendedWorkoutData {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  targetMuscles: string;
  cycleIndex: number;
  cycleTotal: number;
  exerciseCount: number;
  totalSets: number;
  estimatedDurationMin: number;
}

export interface WeekDayStatus {
  index: number; // 0 a 6 (Seg a Dom)
  label: string; // Seg, Ter, Qua, Qui, Sex, Sáb, Dom
  dayOfMonth: number;
  isToday: boolean;
  hasCompletedWorkout: boolean;
  startOfDay: number;
  endOfDay: number;
}

export interface WeekStatusData {
  completedCount: number;
  frequencyGoal: number;
  days: WeekDayStatus[];
}

export interface LastCompletedSessionData {
  id: string;
  workoutId: string | null;
  name: string;
  relativeDate: string;
  totalVolumeText: string;
  durationMin: number;
  totalSets: number;
}

export interface HomeScreenData {
  greeting: string;
  formattedDate: string;
  userName: string | null;
  hasActiveGroup: boolean;
  hasWorkouts: boolean;
  activeSession: ActiveSessionData | null;
  recommendedWorkout: RecommendedWorkoutData | null;
  weekStatus: WeekStatusData;
  lastCompletedSession: LastCompletedSessionData | null;
}

/**
 * Retorna a saudação conforme a hora local do aparelho.
 * Manhã: 05:00 - 11:59 ("Bom dia")
 * Tarde: 12:00 - 17:59 ("Boa tarde")
 * Noite: 18:00 - 04:59 ("Boa noite")
 */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Formata a data atual por extenso em português do Brasil:
 * Exemplo: "Quinta-feira, 24 de outubro"
 */
export function formatHeaderDate(date: Date = new Date()): string {
  const weekdays = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];

  const weekday = weekdays[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];

  return `${weekday}, ${day} de ${month}`;
}

/**
 * Retorna os 7 dias da semana atual (Segunda a Domingo).
 */
export function getCurrentWeekDays(referenceDate: Date = new Date()) {
  const current = new Date(referenceDate);
  const currentDayOfWeek = current.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sab
  // Em pt-BR: Semana começa na Segunda-feira (1). Se for Domingo (0), é o 7º dia (diff = -6).
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(current);
  monday.setDate(current.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const days: {
    index: number;
    label: string;
    dayOfMonth: number;
    startOfDay: number;
    endOfDay: number;
    isToday: boolean;
  }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

    const isToday =
      d.getDate() === referenceDate.getDate() &&
      d.getMonth() === referenceDate.getMonth() &&
      d.getFullYear() === referenceDate.getFullYear();

    days.push({
      index: i,
      label: labels[i],
      dayOfMonth: d.getDate(),
      startOfDay,
      endOfDay,
      isToday,
    });
  }

  return days;
}

/**
 * Formata a data do último treino para o padrão: "Ontem · 23/10", "Hoje · 24/10", "21/10"
 */
export function formatUltimoTreinoData(timestamp: number, referenceDate: Date = new Date()): string {
  const date = new Date(timestamp);
  const startOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0
  ).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  const dayStr = String(date.getDate()).padStart(2, '0');
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const dayMonth = `${dayStr}/${monthStr}`;

  if (timestamp >= startOfToday) {
    return `Hoje · ${dayMonth}`;
  } else if (timestamp >= startOfYesterday) {
    return `Ontem · ${dayMonth}`;
  }

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekdayName = weekdays[date.getDay()];
  return `${weekdayName} · ${dayMonth}`;
}
