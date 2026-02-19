import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  SectionList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import {
  ChevronLeft,
  ChevronRight,
  Syringe,
  CheckCircle,
  Clock,
  AlertTriangle,
  CalendarDays,
  Smartphone,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { db } from '@/lib/db';
import { syncService } from '@/services/SyncService';
import { useUser } from '@/context/UserContext';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import * as ExpoCalendar from 'expo-calendar';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// ─── Helpers ───

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface VaccEvent {
  id: string;
  _id?: string;
  animalId: string;
  animalName: string | null;
  vaccineName: string;
  date: string;
  eventType: string;
  syncStatus?: string;
}

// ─── Component ───

export default function CalendarScreen() {
  const { colorScheme } = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const { mongoUser } = useUser();
  const isDark = colorScheme === 'dark';

  const [vaccinations, setVaccinations] = useState<VaccEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // ─── Data Loading ───

  const loadFromDB = useCallback(() => {
    try {
      const rows = db.getAllSync(
        'SELECT * FROM vaccinations ORDER BY date ASC'
      );
      setVaccinations(rows as VaccEvent[]);
    } catch (e) {
      console.error('Calendar: Error loading vaccinations from DB', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchFromApi = useCallback(async () => {
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected || netState.isInternetReachable === false) return;
      if (!mongoUser?._id) return;

      const response = await axios.get(`${API_BASE_URL}/api/vaccination-events`, {
        params: { farmerId: mongoUser._id },
      });

      if (response.data && Array.isArray(response.data)) {
        for (const v of response.data) {
          try {
            const local = db.getFirstSync<{ syncStatus: string }>('SELECT syncStatus FROM vaccinations WHERE id = ?', [v._id]);
            if (local && local.syncStatus === 'pending') continue;

            db.runSync(
              'INSERT OR REPLACE INTO vaccinations (id, animalId, animalName, vaccineName, date, status, eventType, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [
                v._id,
                v.animalId?._id || v.animalId,
                v.animalId?.name || null,
                v.vaccineName,
                v.date,
                v.status || null,
                v.eventType,
                'synced',
              ]
            );
          } catch (e) {
            console.log('Calendar: Error caching vaccination event', e);
          }
        }

        // Re-load from DB to get consistent data
        loadFromDB();
      }
    } catch (error) {
      console.error('Calendar: Error fetching vaccination events from API', error);
    }
  }, [mongoUser, loadFromDB]);

  useFocusEffect(
    useCallback(() => {
      loadFromDB();
      fetchFromApi();
    }, [loadFromDB, fetchFromApi])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFromDB();
    fetchFromApi();
  }, [loadFromDB, fetchFromApi]);

  // ─── Mark as Done ───

  const handleResolveVaccination = async (vacc: VaccEvent) => {
    try {
      const vaccId = vacc._id || vacc.id;
      if (!vaccId) return;

      Alert.alert(
        'Mark Vaccination Done',
        `Mark "${vacc.vaccineName}" for ${vacc.animalName || 'this animal'} as administered?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Done',
            onPress: async () => {
              // 1. Optimistic update
              setVaccinations(prev =>
                prev.map(v => (v._id === vaccId || v.id === vaccId) ? { ...v, eventType: 'administered' } : v)
              );

              // 2. Update local DB
              db.runSync(
                'UPDATE vaccinations SET eventType = ?, status = ?, syncStatus = ? WHERE id = ?',
                ['administered', 'administered', 'pending', vaccId]
              );

              // 3. Queue sync
              await syncService.addToQueue('RESOLVE', 'vaccinations', { _id: vaccId });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error resolving vaccination:', error);
      Alert.alert('Error', 'Failed to update vaccination status');
    }
  };

  // ─── Sync with Phone Calendar ───

  const syncToPhoneCalendar = async () => {
    try {
      const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Calendar permission is needed to sync vaccination events.');
        return;
      }

      // Get or create calendar
      const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
      let calendarId: string;

      const existingCal = calendars.find(c => c.title === 'पशु पहचान Vaccinations');
      if (existingCal) {
        calendarId = existingCal.id;
      } else {
        // Create a new calendar
        const defaultSource = Platform.OS === 'ios'
          ? calendars.find(c => c.source?.name === 'iCloud')?.source || calendars.find(c => c.allowsModifications)?.source
          : { isLocalAccount: true, name: 'Pashu Pehchan', type: ExpoCalendar.CalendarType.LOCAL as any };

        if (!defaultSource) {
          Alert.alert('Error', 'No calendar source available');
          return;
        }

        calendarId = await ExpoCalendar.createCalendarAsync({
          title: 'पशु पहचान Vaccinations',
          color: '#22c55e',
          entityType: ExpoCalendar.EntityTypes.EVENT,
          sourceId: (defaultSource as any).id,
          source: defaultSource as any,
          name: 'PashuPehchanVaccinations',
          ownerAccount: 'personal',
          accessLevel: ExpoCalendar.CalendarAccessLevel.OWNER,
        });
      }

      // Sync upcoming vaccinations
      const upcoming = vaccinations.filter(
        v => v.eventType === 'scheduled' || v.eventType === 'missed'
      );

      let synced = 0;
      for (const v of upcoming) {
        try {
          const eventDate = new Date(v.date);
          await ExpoCalendar.createEventAsync(calendarId, {
            title: `💉 ${v.vaccineName}`,
            notes: `Vaccination for ${v.animalName || 'Animal'}`,
            startDate: eventDate,
            endDate: new Date(eventDate.getTime() + 60 * 60 * 1000), // 1 hour
            timeZone: 'Asia/Kolkata',
            alarms: [{ relativeOffset: -60 * 24 }], // 1 day before
          });
          synced++;
        } catch (e) {
          console.log('Error creating calendar event:', e);
        }
      }

      Alert.alert('Synced!', `${synced} vaccination event${synced !== 1 ? 's' : ''} added to your phone calendar.`);
    } catch (error) {
      console.error('Error syncing to phone calendar:', error);
      Alert.alert('Error', 'Failed to sync with phone calendar.');
    }
  };

  // ─── Calendar Data ───

  const vaccByDate = useMemo(() => {
    const map: Record<string, VaccEvent[]> = {};
    for (const v of vaccinations) {
      if (!v.date) continue;
      const key = formatDateKey(new Date(v.date));
      if (!map[key]) map[key] = [];
      map[key].push(v);
    }
    return map;
  }, [vaccinations]);

  const selectedDateKey = formatDateKey(selectedDate);
  const selectedEvents = vaccByDate[selectedDateKey] || [];

  // Agenda: upcoming events from today
  const agendaSections = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = vaccinations
      .filter(v => new Date(v.date) >= today && v.eventType !== 'administered')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const sections: { title: string; data: VaccEvent[] }[] = [];
    let currentKey = '';

    for (const v of upcoming) {
      const date = new Date(v.date);
      const key = formatDateKey(date);
      if (key !== currentKey) {
        currentKey = key;
        const isToday = isSameDay(date, new Date());
        const isTomorrow = isSameDay(date, new Date(Date.now() + 86400000));
        const label = isToday
          ? 'Today'
          : isTomorrow
          ? 'Tomorrow'
          : date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
        sections.push({ title: label, data: [] });
      }
      sections[sections.length - 1].data.push(v);
    }

    return sections;
  }, [vaccinations]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const administered = vaccinations.filter(v => v.eventType === 'administered').length;
    const scheduled = vaccinations.filter(v => v.eventType === 'scheduled' && new Date(v.date) >= now).length;
    const overdue = vaccinations.filter(v =>
      (v.eventType === 'scheduled' || v.eventType === 'missed') && new Date(v.date) < now
    ).length;
    return { administered, scheduled, overdue };
  }, [vaccinations]);

  const monthDays = getMonthDays(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDate(now);
  };

  // ─── Tab State ───
  const [activeTab, setActiveTab] = useState<'calendar' | 'agenda'>('calendar');

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={themeColors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Georgia' }}>
            Vaccination Calendar
          </Text>
          <TouchableOpacity
            onPress={syncToPhoneCalendar}
            className="bg-primary/10 px-3 py-2 rounded-xl flex-row items-center gap-1.5"
          >
            <Smartphone size={14} color={themeColors.primary} />
            <Text className="text-xs font-bold text-primary">Sync</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-muted-foreground">
          Track and manage vaccination schedules
        </Text>
      </View>

      {/* Stats Bar */}
      <View className="px-5 py-2">
        <View className="flex-row gap-2">
          <View className="flex-1 bg-green-500/10 rounded-xl px-3 py-2.5 items-center">
            <Text className="text-lg font-bold" style={{ color: '#22c55e' }}>
              {stats.administered}
            </Text>
            <Text className="text-[10px] text-muted-foreground font-medium">Done</Text>
          </View>
          <View className="flex-1 bg-amber-500/10 rounded-xl px-3 py-2.5 items-center">
            <Text className="text-lg font-bold" style={{ color: '#f59e0b' }}>
              {stats.scheduled}
            </Text>
            <Text className="text-[10px] text-muted-foreground font-medium">Upcoming</Text>
          </View>
          <View className="flex-1 bg-red-500/10 rounded-xl px-3 py-2.5 items-center">
            <Text className="text-lg font-bold" style={{ color: '#ef4444' }}>
              {stats.overdue}
            </Text>
            <Text className="text-[10px] text-muted-foreground font-medium">Overdue</Text>
          </View>
        </View>
      </View>

      {/* Tab Switcher */}
      <View className="px-5 py-2">
        <View className="flex-row bg-muted rounded-xl p-1">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'calendar' ? 'bg-card' : ''}`}
            onPress={() => setActiveTab('calendar')}
            style={activeTab === 'calendar' ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : {}}
          >
            <Text className={`text-sm font-semibold ${activeTab === 'calendar' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Calendar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'agenda' ? 'bg-card' : ''}`}
            onPress={() => setActiveTab('agenda')}
            style={activeTab === 'agenda' ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : {}}
          >
            <Text className={`text-sm font-semibold ${activeTab === 'agenda' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Agenda
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'calendar' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
          }
        >
          {/* Month Navigation */}
          <View className="px-5 py-2">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                {/* Month Header */}
                <View className="flex-row items-center justify-between mb-4">
                  <TouchableOpacity onPress={prevMonth} className="bg-muted p-2 rounded-lg">
                    <ChevronLeft size={18} color={themeColors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={goToToday}>
                    <Text className="text-base font-bold text-foreground">
                      {MONTHS[currentMonth]} {currentYear}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={nextMonth} className="bg-muted p-2 rounded-lg">
                    <ChevronRight size={18} color={themeColors.foreground} />
                  </TouchableOpacity>
                </View>

                {/* Weekday Headers */}
                <View className="flex-row mb-2">
                  {WEEKDAYS.map(day => (
                    <View key={day} className="flex-1 items-center">
                      <Text className="text-[10px] font-bold text-muted-foreground uppercase">{day}</Text>
                    </View>
                  ))}
                </View>

                {/* Day Grid */}
                <View className="flex-row flex-wrap">
                  {monthDays.map((day, idx) => {
                    if (day === null) {
                      return <View key={`empty-${idx}`} style={{ width: '14.28%', height: 44 }} />;
                    }

                    const dateObj = new Date(currentYear, currentMonth, day);
                    const key = formatDateKey(dateObj);
                    const events = vaccByDate[key] || [];
                    const isSelected = isSameDay(dateObj, selectedDate);
                    const isToday = isSameDay(dateObj, new Date());

                    const hasAdministered = events.some(e => e.eventType === 'administered');
                    const hasScheduled = events.some(e => e.eventType === 'scheduled');
                    const hasOverdue = events.some(e => e.eventType === 'missed' || (e.eventType === 'scheduled' && dateObj < new Date()));

                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        onPress={() => setSelectedDate(dateObj)}
                        style={{ width: '14.28%', height: 44, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <View
                          className={`w-9 h-9 rounded-full items-center justify-center ${
                            isSelected ? 'bg-primary' : isToday ? 'bg-primary/15' : ''
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              isSelected
                                ? 'text-primary-foreground'
                                : isToday
                                ? 'text-primary'
                                : 'text-foreground'
                            }`}
                          >
                            {day}
                          </Text>
                        </View>
                        {/* Dot indicators */}
                        {events.length > 0 && (
                          <View className="flex-row gap-0.5 mt-0.5 absolute bottom-0">
                            {hasOverdue && (
                              <View className="w-1 h-1 rounded-full bg-destructive" />
                            )}
                            {hasScheduled && !hasOverdue && (
                              <View className="w-1 h-1 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                            )}
                            {hasAdministered && (
                              <View className="w-1 h-1 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Selected Date Events */}
          <View className="px-5 py-2">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 ml-1">
              {isSameDay(selectedDate, new Date()) ? 'Today' : selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' '}· {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
            </Text>

            {selectedEvents.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-10 items-center justify-center">
                  <CalendarDays size={28} color={themeColors.mutedForeground} style={{ opacity: 0.4 }} />
                  <Text className="text-sm text-muted-foreground mt-3">No vaccinations on this day</Text>
                </CardContent>
              </Card>
            ) : (
              <View className="gap-2">
                {selectedEvents.map((vacc, index) => (
                  <VaccCard key={vacc.id || index} vacc={vacc} themeColors={themeColors} onResolve={handleResolveVaccination} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* Agenda View */
        <SectionList
          sections={agendaSections}
          keyExtractor={(item, index) => item.id || `${index}`}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View className="py-3 pt-5">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View className="mb-2">
              <VaccCard vacc={item} themeColors={themeColors} onResolve={handleResolveVaccination} />
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <CalendarDays size={36} color={themeColors.mutedForeground} style={{ opacity: 0.3 }} />
              <Text className="text-sm text-muted-foreground mt-4">No upcoming vaccinations</Text>
              <Text className="text-xs text-muted-foreground mt-1 opacity-60">
                All vaccinations are up to date!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Vaccination Card Component ───

function VaccCard({
  vacc,
  themeColors,
  onResolve,
}: {
  vacc: VaccEvent;
  themeColors: typeof Colors.light;
  onResolve: (vacc: VaccEvent) => void;
}) {
  const vaccDate = new Date(vacc.date);
  const isPast = vaccDate < new Date();
  const isAdministered = vacc.eventType === 'administered';
  const isOverdue = !isAdministered && isPast;

  const statusColor = isAdministered ? '#22c55e' : isOverdue ? '#ef4444' : '#f59e0b';
  const statusBg = isAdministered ? 'bg-green-500/10' : isOverdue ? 'bg-red-500/10' : 'bg-amber-500/10';
  const statusText = isAdministered ? 'Administered' : isOverdue ? 'Overdue' : 'Scheduled';
  const StatusIcon = isAdministered ? CheckCircle : isOverdue ? AlertTriangle : Clock;

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-0">
        {/* Status strip */}
        <View style={{ height: 3, backgroundColor: statusColor, width: '100%' }} />
        
        <View className="p-4">
          <View className="flex-row items-start gap-3">
            {/* Icon */}
            <View className={`w-10 h-10 rounded-full items-center justify-center ${statusBg}`}>
              <Syringe size={18} color={statusColor} />
            </View>

            {/* Details */}
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                {vacc.vaccineName || 'Unknown Vaccine'}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                {vacc.animalName || 'Unknown Animal'}
              </Text>
              <View className="flex-row items-center gap-3 mt-2">
                <View className="flex-row items-center gap-1">
                  <CalendarDays size={10} color={themeColors.mutedForeground} />
                  <Text className="text-[10px] text-muted-foreground">
                    {vaccDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${statusBg}`}>
                  <StatusIcon size={8} color={statusColor} />
                  <Text style={{ color: statusColor, fontSize: 9, fontWeight: '700' }}>{statusText}</Text>
                </View>
              </View>
            </View>

            {/* Action */}
            {!isAdministered && (
              <TouchableOpacity
                onPress={() => onResolve(vacc)}
                className="bg-primary/10 px-3 py-2 rounded-xl flex-row items-center gap-1"
              >
                <CheckCircle size={12} color={themeColors.primary} />
                <Text className="text-[10px] font-bold text-primary">Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
