import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/modules/auth/api';
import { uploadFoodPhoto } from '@/src/modules/food-logging/api';
import { Button } from '@/src/shared/ui/Button';

export default function LogCameraScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [uploading, setUploading] = useState(false);

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
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="w-10 h-10 items-center justify-center -ml-2">
            <Ionicons name="close" size={26} color="#9ca3af" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mb-5">
            <Ionicons name="camera-outline" size={36} color="#10b981" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white text-center">
            Camera permission needed
          </Text>
          <Text className="text-base text-neutral-500 dark:text-neutral-400 text-center mt-2 mb-8">
            Nutrify needs your camera to snap photos of meals and identify them with AI.
          </Text>
          <View className="w-full">
            <Button onPress={requestPermission}>Grant access</Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || !user || uploading) return;

    try {
      setUploading(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });
      if (!photo?.uri) {
        Alert.alert('Capture failed', 'Photo capture nahi hua, retry karo.');
        return;
      }
      const uploaded = await uploadFoodPhoto({ userId: user.id, localUri: photo.uri });
      router.replace({
        pathname: '/log-photo-confirm' as never,
        params: { storagePath: uploaded.storagePath, localUri: photo.uri },
      });
    } catch (err) {
      console.error(err);
      Alert.alert(
        'Upload failed',
        err instanceof Error ? err.message : 'Network issue, retry karo.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handlePickFromGallery() {
    if (!user || uploading) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploading(true);
      const localUri = result.assets[0].uri;
      const uploaded = await uploadFoodPhoto({ userId: user.id, localUri });
      router.replace({
        pathname: '/log-photo-confirm' as never,
        params: { storagePath: uploaded.storagePath, localUri },
      });
    } catch (err) {
      console.error(err);
      Alert.alert(
        'Upload failed',
        err instanceof Error ? err.message : 'Network issue, retry karo.',
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

      {/* Top close button */}
      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
        <View className="px-4 pt-2 flex-row">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center">
            <Ionicons name="close" size={22} color="white" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
        <View className="pb-6 pt-4 px-8 flex-row items-center justify-between">
          <Pressable
            onPress={handlePickFromGallery}
            disabled={uploading}
            hitSlop={10}
            className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
            <Ionicons name="images-outline" size={22} color="white" />
          </Pressable>

          <Pressable
            onPress={handleCapture}
            disabled={uploading}
            className="w-20 h-20 rounded-full bg-white items-center justify-center"
            style={{ borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)' }}>
            {uploading ? (
              <ActivityIndicator color="#10b981" />
            ) : (
              <View className="w-16 h-16 rounded-full bg-emerald-500" />
            )}
          </Pressable>

          <View className="w-12 h-12" />
        </View>
        <View className="items-center pb-4">
          <Text className="text-xs text-white/70">
            {uploading ? 'Uploading…' : 'Hold steady, get the whole plate in frame'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
