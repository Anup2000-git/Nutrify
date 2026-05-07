import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useRefreshProfile } from '@/src/modules/auth/api';
import { recomputeTargets, updateProfileFields } from '@/src/modules/onboarding/api';
import { Button } from '@/src/shared/ui/Button';
import { Input } from '@/src/shared/ui/Input';
import type {
  ActivityLevel,
  DietPreference,
  Gender,
  Goal,
  LifeStage,
} from '@/src/types/models';

const GOALS: { value: Goal; label: string }[] = [
  { value: 'weight_loss', label: 'Weight loss' },
  { value: 'weight_gain', label: 'Weight gain' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'muscle_gain', label: 'Build muscle' },
  { value: 'general', label: 'General health' },
];

const ACTIVITIES: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'heavy', label: 'Heavy' },
];

const LIFESTAGES: { value: LifeStage; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'working', label: 'Working' },
  { value: 'pregnant', label: 'Pregnant' },
  { value: 'postpartum', label: 'Postpartum' },
  { value: 'senior', label: 'Senior' },
];

const DIETS: { value: DietPreference; label: string }[] = [
  { value: 'veg', label: 'Veg' },
  { value: 'non_veg', label: 'Non-veg' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'jain', label: 'Jain' },
  { value: 'vegan', label: 'Vegan' },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const MIN_DATE = new Date(1900, 0, 1);
const TODAY = new Date();
const DEFAULT_DOB = new Date(TODAY.getFullYear() - 25, 0, 1);

function formatIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EditStatsScreen() {
  const { user, profile } = useAuth();
  const refreshProfile = useRefreshProfile();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [goal, setGoal] = useState<Goal | null>(profile?.goal ?? null);
  const [activity, setActivity] = useState<ActivityLevel | null>(profile?.activity_level ?? null);
  const [lifestage, setLifestage] = useState<LifeStage | null>(profile?.life_stage ?? null);
  const [diet, setDiet] = useState<DietPreference | null>(profile?.diet_preference ?? null);
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [heightCm, setHeightCm] = useState(profile?.height_cm ? String(profile.height_cm) : '');
  const [weightKg, setWeightKg] = useState(profile?.current_weight_kg ? String(profile.current_weight_kg) : '');
  const [dob, setDob] = useState(profile?.date_of_birth ?? '');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selected) setDob(formatIsoDate(selected));
  }

  async function handleSave() {
    setError(null);
    if (!user) return;
    if (!fullName.trim()) return setError('Naam daalo');
    if (!goal || !activity || !lifestage || !diet || !gender) return setError('Sab fields select karo');

    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!h || h < 80 || h > 260) return setError('Height 80-260 cm valid');
    if (!w || w < 20 || w > 300) return setError('Weight 20-300 kg valid');
    if (!dob) return setError('Date of birth select karo');

    setSaving(true);
    try {
      await updateProfileFields(user.id, {
        full_name: fullName.trim(),
        goal,
        activity_level: activity,
        life_stage: lifestage,
        diet_preference: diet,
        gender,
        height_cm: h,
        current_weight_kg: w,
        date_of_birth: dob,
      });

      // Ask if user wants to recalculate targets
      Alert.alert(
        'Profile updated',
        'Recalculate your daily targets based on these new stats?',
        [
          {
            text: 'Keep current',
            onPress: async () => {
              await refreshProfile();
              router.back();
            },
          },
          {
            text: 'Recalculate',
            onPress: async () => {
              try {
                await recomputeTargets(user.id);
                await refreshProfile();
                router.back();
              } catch (err) {
                Alert.alert(
                  'Recalculation failed',
                  err instanceof Error ? err.message : 'Try again',
                );
              }
            },
          },
        ],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const pickerInitial = dob ? new Date(dob) : DEFAULT_DOB;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1">
      <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950">
        <View className="px-5 pb-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="w-10 h-10 items-center justify-center -ml-2">
            <Ionicons name="close" size={26} color="#9ca3af" />
          </Pressable>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-white ml-2">
            Edit profile
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Input
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          {/* Goal */}
          <SectionLabel title="Goal" />
          <ChipGroup
            options={GOALS}
            selected={goal}
            onSelect={(v) => setGoal(v)}
          />

          {/* Activity */}
          <SectionLabel title="Activity level" />
          <ChipGroup
            options={ACTIVITIES}
            selected={activity}
            onSelect={(v) => setActivity(v)}
          />

          {/* Lifestage */}
          <SectionLabel title="Life stage" />
          <ChipGroup
            options={LIFESTAGES}
            selected={lifestage}
            onSelect={(v) => setLifestage(v)}
          />

          {/* Diet */}
          <SectionLabel title="Diet preference" />
          <ChipGroup
            options={DIETS}
            selected={diet}
            onSelect={(v) => setDiet(v)}
          />

          {/* Gender */}
          <SectionLabel title="Gender" />
          <ChipGroup options={GENDERS} selected={gender} onSelect={(v) => setGender(v)} />

          {/* Height + Weight */}
          <View className="h-2" />
          <Input
            label="Height (cm)"
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="numeric"
            maxLength={3}
          />
          <Input
            label="Current weight (kg)"
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
            maxLength={6}
          />

          {/* DOB */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Date of birth
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="h-12 px-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 flex-row items-center border border-neutral-200 dark:border-neutral-800">
              <Ionicons name="calendar-outline" size={18} color="#10b981" />
              <Text
                className={`ml-3 flex-1 text-base ${
                  dob ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'
                }`}>
                {dob ? formatDisplayDate(dob) : 'Select your date of birth'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </Pressable>
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

          {error ? (
            <Text className="text-sm text-red-500 mb-3">{error}</Text>
          ) : null}

          <Button onPress={handleSave} loading={saving}>
            Save changes
          </Button>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-2">
      {title}
    </Text>
  );
}

function ChipGroup<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-4">
      {options.map((o) => {
        const isSelected = selected === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onSelect(o.value)}
            className={`px-3 py-2 rounded-full border-2 ${
              isSelected
                ? 'border-emerald-500 bg-emerald-500'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
            }`}>
            <Text
              className={`text-xs font-semibold ${
                isSelected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
              }`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
