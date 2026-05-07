import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/modules/auth/api';
import { logCustomMeal, detectMealType, calculateMacrosForQuantity } from '@/src/modules/food-logging/api';
import { Button } from '@/src/shared/ui/Button';

type ProductData = {
  name: string;
  calories_per_100g: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export default function LogBarcodeScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [quantity, setQuantity] = useState('100');

  if (!permission) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
        <View className="px-6 pt-4 flex-row items-center">
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={26} color="#9ca3af" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-bold text-center mb-4 text-neutral-900 dark:text-white">Camera permission needed</Text>
          <Button onPress={requestPermission}>Grant access</Button>
        </View>
      </SafeAreaView>
    );
  }

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`);
      const json = await res.json();

      if (json.status !== 1) {
        Alert.alert('Not found', 'Product not found in Open Food Facts database.', [
          { text: 'Scan again', onPress: () => setScanned(false) },
        ]);
        setLoading(false);
        return;
      }

      const p = json.product;
      setProduct({
        name: p.product_name || 'Unknown Product',
        calories_per_100g: p.nutriments?.['energy-kcal_100g'] || 0,
        protein_g: p.nutriments?.proteins_100g || 0,
        carbs_g: p.nutriments?.carbohydrates_100g || 0,
        fat_g: p.nutriments?.fat_100g || 0,
        fiber_g: p.nutriments?.fiber_100g || 0,
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch product data.', [
        { text: 'Try again', onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleLog() {
    if (!user || !product) return;
    const q = Number(quantity);
    if (!q || q <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      const macros = calculateMacrosForQuantity(product, q);
      await logCustomMeal({
        userId: user.id,
        foodName: product.name,
        quantityGrams: q,
        mealType: detectMealType(),
        calories: macros.calories,
        protein_g: macros.protein_g,
        carbs_g: macros.carbs_g,
        fat_g: macros.fat_g,
        fiber_g: macros.fiber_g,
      });
      router.dismissAll();
    } catch (error) {
      Alert.alert('Error', 'Failed to log meal');
    } finally {
      setLoading(false);
    }
  }

  if (product) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950 p-6">
        <Pressable onPress={() => setProduct(null) || setScanned(false)} hitSlop={10} className="mb-6">
          <Ionicons name="arrow-back" size={26} color="#9ca3af" />
        </Pressable>

        <View className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 p-5 mb-5">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{product.name}</Text>
          <Text className="text-sm text-emerald-700 dark:text-emerald-300 mt-2 uppercase font-semibold">
            {Math.round(product.calories_per_100g)} kcal per 100g
          </Text>
        </View>

        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Quantity (g/ml)</Text>
        <TextInput
          className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl h-14 px-4 text-base text-neutral-900 dark:text-white mb-6"
          keyboardType="decimal-pad"
          value={quantity}
          onChangeText={setQuantity}
        />

        <Button onPress={handleLog} loading={loading}>Log Meal</Button>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
        <View className="px-4 pt-2">
          <Pressable onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full bg-black/40 items-center justify-center">
            <Ionicons name="close" size={22} color="white" />
          </Pressable>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 items-center pb-8">
        {loading ? (
          <View className="p-4 rounded-xl bg-black/60 items-center">
            <ActivityIndicator color="#10b981" />
            <Text className="text-white mt-2">Looking up product...</Text>
          </View>
        ) : (
          <View className="p-4 rounded-xl bg-black/60">
            <Text className="text-white text-base">Point camera at a barcode</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
