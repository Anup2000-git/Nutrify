import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { useAuth } from "@/src/modules/auth/api";
import { submitFeedback } from "@/src/modules/feedback/api";
import { Button } from "@/src/shared/ui/Button";
import { Screen } from "@/src/shared/ui/Screen";

export default function FeedbackScreen() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!user) return;
    if (!message.trim()) {
      Alert.alert("Feedback", "Kuch toh likho feedback mein!");
      return;
    }
    if (rating === 0) {
      Alert.alert("Rating", "Star rating select karo");
      return;
    }

    setLoading(true);
    try {
      await submitFeedback({
        userId: user.id,
        message: message.trim(),
        rating,
      });
      Alert.alert(
        "Thank you! 🙏",
        "Aapka feedback mil gaya. Hum isse improve karenge.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to submit",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View className="mb-6">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#6b7280" />
        </Pressable>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
          Feedback
        </Text>
        <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-2">
          Tell us what you think — bugs, feature ideas, anything!
        </Text>
      </View>

      {/* Star rating */}
      <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
        Rate your experience
      </Text>
      <View className="flex-row gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => setRating(star)} hitSlop={8}>
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color={star <= rating ? "#f59e0b" : "#d1d5db"}
            />
          </Pressable>
        ))}
      </View>

      {/* Message input */}
      <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
        Your feedback
      </Text>
      <TextInput
        className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 text-base text-neutral-900 dark:text-white min-h-[120px]"
        placeholder="What's on your mind? Bugs, suggestions, feature requests..."
        placeholderTextColor="#9ca3af"
        multiline
        textAlignVertical="top"
        value={message}
        onChangeText={setMessage}
        maxLength={1000}
      />
      <Text className="text-xs text-neutral-400 mt-1 text-right">
        {message.length}/1000
      </Text>

      <View className="mt-6">
        <Button onPress={handleSubmit} loading={loading}>
          Submit feedback
        </Button>
      </View>
    </Screen>
  );
}
