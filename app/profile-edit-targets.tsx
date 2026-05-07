import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useRefreshProfile } from '@/src/modules/auth/api';
import { recomputeTargets, updateProfileFields } from '@/src/modules/onboarding/api';
import { Button } from '@/src/shared/ui/Button';
import { Input } from '@/src/shared/ui/Input';

export default function EditTargetsScreen() {
  const { user, profile } = useAuth();
  const refreshProfile = useRefreshProfile();

  const [calories, setCalories] = useState(String(profile?.daily_calorie_target ?? ''));
  const [protein, setProtein] = useState(String(profile?.daily_protein_g ?? ''));
  const [carbs, setCarbs] = useState(String(profile?.daily_carbs_g ?? ''));
  const [fat, setFat] = useState(String(profile?.daily_fat_g ?? ''));
  const [water, setWater] = useState(String(profile?.daily_water_ml ?? ''));

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!user) return;

    const c = Number(calories);
    const p = Number(protein);
    const cb = Number(carbs);
    const f = Number(fat);
    const w = Number(water);

    if (!c || c < 800 || c > 6000) return setError('Calories 800-6000 ke beech mein honi chahiye');
    if (!p || p < 0 || p > 500) return setError('Protein 0-500g valid');
    if (!cb || cb < 0 || cb > 1000) return setError('Carbs 0-1000g valid');
    if (!f || f < 0 || f > 300) return setError('Fat 0-300g valid');
    if (!w || w < 500 || w > 8000) return setError('Water 500-8000 ml valid');

    setSaving(true);
    try {
      await updateProfileFields(user.id, {
        daily_calorie_target: c,
        daily_protein_g: p,
        daily_carbs_g: cb,
        daily_fat_g: f,
        daily_water_ml: w,
      });
      await refreshProfile();
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToAuto() {
    if (!user) return;
    Alert.alert(
      'Reset to auto-calculated?',
      'Targets will be recalculated from your height, weight, age, goal, and activity level.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            setResetting(true);
            try {
              const updated = await recomputeTargets(user.id);
              await refreshProfile();
              const u = updated as unknown as Record<string, number>;
              setCalories(String(u.daily_calorie_target ?? ''));
              setProtein(String(u.daily_protein_g ?? ''));
              setCarbs(String(u.daily_carbs_g ?? ''));
              setFat(String(u.daily_fat_g ?? ''));
              setWater(String(u.daily_water_ml ?? ''));
            } catch (err) {
              Alert.alert('Reset failed', err instanceof Error ? err.message : 'Try again');
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1">
      <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950">
        {/* Header */}
        <View className="px-5 pb-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="w-10 h-10 items-center justify-center -ml-2">
            <Ionicons name="close" size={26} color="#9ca3af" />
          </Pressable>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-white ml-2">
            Edit daily targets
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text className="text-base text-neutral-500 dark:text-neutral-400 mb-6 leading-6">
            Set the daily targets your dietician suggested, or use AI Coach. Auto-calculation always available below.
          </Text>

          <Input
            label="Calories (kcal)"
            placeholder="2000"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            maxLength={4}
          />

          <Input
            label="Protein (g)"
            placeholder="120"
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
            maxLength={3}
          />

          <Input
            label="Carbs (g)"
            placeholder="250"
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
            maxLength={4}
          />

          <Input
            label="Fat (g)"
            placeholder="65"
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
            maxLength={3}
          />

          <Input
            label="Water (ml)"
            placeholder="2500"
            value={water}
            onChangeText={setWater}
            keyboardType="numeric"
            maxLength={4}
            error={error ?? undefined}
          />

          <View className="mt-2">
            <Button onPress={handleSave} loading={saving}>
              Save targets
            </Button>
          </View>

          <View className="mt-3">
            <Button onPress={handleResetToAuto} variant="secondary" loading={resetting}>
              Reset to auto-calculated
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
