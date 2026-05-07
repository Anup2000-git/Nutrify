import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { useAuth, useRefreshProfile } from '@/src/modules/auth/api';
import { OnboardingHeader } from '@/src/modules/onboarding/components/OnboardingHeader';
import { saveFullProfile, useOnboardingStore } from '@/src/modules/onboarding/api';
import { Button } from '@/src/shared/ui/Button';
import { Input } from '@/src/shared/ui/Input';
import { Screen } from '@/src/shared/ui/Screen';
import type { Gender } from '@/src/types/models';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const MIN_DATE = new Date(1900, 0, 1);
const TODAY = new Date();
const DEFAULT_DOB = new Date(TODAY.getFullYear() - 25, 0, 1); // ~25 years ago

function formatIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function StatsScreen() {
  const { user } = useAuth();
  const refreshProfile = useRefreshProfile();
  const store = useOnboardingStore();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  function validate(): string | null {
    if (!store.gender) return 'Gender select karo';
    if (!store.heightCm || isNaN(Number(store.heightCm))) return 'Height in cm daalo';
    if (Number(store.heightCm) < 80 || Number(store.heightCm) > 260) return 'Height between 80-260 cm honi chahiye';
    if (!store.weightKg || isNaN(Number(store.weightKg))) return 'Weight in kg daalo';
    if (Number(store.weightKg) < 20 || Number(store.weightKg) > 300) return 'Weight between 20-300 kg honi chahiye';
    if (!store.dateOfBirth) return 'Date of birth select karo';
    if (!store.goal || !store.activity || !store.lifestage || !store.diet) {
      return 'Pichle steps complete nahi hain';
    }
    return null;
  }

  function handleDateChange(event: DateTimePickerEvent, selected?: Date) {
    // Android auto-dismisses the dialog; iOS keeps it open until user dismisses.
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selected) {
      store.setDateOfBirth(formatIsoDate(selected));
    }
  }

  async function handleSubmit() {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!user) {
      setError('Login session khatam ho gaya — phir login karo');
      return;
    }

    setSubmitting(true);
    try {
      await saveFullProfile(user.id, {
        goal: store.goal!,
        activity_level: store.activity!,
        life_stage: store.lifestage!,
        diet_preference: store.diet!,
        gender: store.gender!,
        height_cm: Number(store.heightCm),
        current_weight_kg: Number(store.weightKg),
        date_of_birth: store.dateOfBirth,
      });
      await refreshProfile();
      store.reset();
      router.replace('/(onboarding)/review' as never);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : 'Save karne mein issue aaya, retry karo',
      );
      Alert.alert('Save failed', 'Connection check karo aur retry karo.');
    } finally {
      setSubmitting(false);
    }
  }

  const pickerInitial = store.dateOfBirth ? new Date(store.dateOfBirth) : DEFAULT_DOB;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1">
      <Screen contentClassName="px-6 pt-12 pb-12">
        <OnboardingHeader
          step={5}
          totalSteps={5}
          title="Last step"
          subtitle="Aapki stats — calorie targets calculate karne ke liye"
        />

        {/* Gender */}
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Gender
        </Text>
        <View className="flex-row gap-2 mb-5">
          {GENDERS.map((g) => {
            const selected = store.gender === g.value;
            return (
              <Pressable
                key={g.value}
                onPress={() => store.setGender(g.value)}
                className={`flex-1 h-12 rounded-xl items-center justify-center border-2 ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                }`}>
                <Text
                  className={`text-sm font-semibold ${
                    selected
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}>
                  {g.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Height */}
        <Input
          label="Height (cm)"
          placeholder="170"
          value={store.heightCm}
          onChangeText={store.setHeightCm}
          keyboardType="numeric"
          maxLength={3}
        />

        {/* Weight */}
        <Input
          label="Current weight (kg)"
          placeholder="65"
          value={store.weightKg}
          onChangeText={store.setWeightKg}
          keyboardType="decimal-pad"
          maxLength={6}
        />

        {/* Date of birth — calendar picker */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Date of birth
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className={`h-12 px-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 flex-row items-center border ${
              error
                ? 'border-red-400'
                : 'border-neutral-200 dark:border-neutral-800'
            }`}>
            <Ionicons name="calendar-outline" size={18} color="#10b981" />
            <Text
              className={`ml-3 flex-1 text-base ${
                store.dateOfBirth
                  ? 'text-neutral-900 dark:text-white'
                  : 'text-neutral-400'
              }`}>
              {store.dateOfBirth ? formatDisplayDate(store.dateOfBirth) : 'Select your date of birth'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#9ca3af" />
          </Pressable>
          {error ? (
            <Text className="text-xs text-red-500 mt-1">{error}</Text>
          ) : (
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Tap to open calendar
            </Text>
          )}
        </View>

        {showDatePicker ? (
          <DateTimePicker
            value={pickerInitial}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={TODAY}
            minimumDate={MIN_DATE}
            onChange={handleDateChange}
          />
        ) : null}

        {/* iOS spinner needs an explicit "Done" button to dismiss */}
        {Platform.OS === 'ios' && showDatePicker ? (
          <View className="mb-4">
            <Button variant="secondary" size="md" onPress={() => setShowDatePicker(false)}>
              Done
            </Button>
          </View>
        ) : null}

        <View className="mt-2">
          <Button onPress={handleSubmit} loading={submitting}>
            Done
          </Button>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
