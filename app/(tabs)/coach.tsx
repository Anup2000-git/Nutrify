import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    clearChatHistory,
    fetchChatHistory,
    sendChatMessage,
    type ChatMessage,
} from "@/src/modules/ai-coach/api";
import { useAuth } from "@/src/modules/auth/api";

const QUICK_PROMPTS = [
  "Aaj kya khaaun lunch mein?",
  "My protein intake kaisa hai?",
  "Suggest a healthy snack",
  "Rate my diet today",
];

function TypingIndicator() {
  return (
    <View className="mb-4 max-w-[85%] self-start">
      <View className="flex-row items-center mb-1">
        <View className="w-5 h-5 rounded-full bg-emerald-500 items-center justify-center mr-2">
          <Ionicons name="sparkles" size={10} color="white" />
        </View>
        <Text className="text-xs text-neutral-500 font-medium">Coach</Text>
      </View>
      <View className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900 rounded-tl-sm flex-row items-center">
        <View className="flex-row gap-1">
          <View className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" />
          <View className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse" />
          <View className="w-2 h-2 rounded-full bg-neutral-200 animate-pulse" />
        </View>
        <Text className="text-sm text-neutral-400 ml-2">Thinking...</Text>
      </View>
    </View>
  );
}

export default function CoachScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["coachChat", user?.id],
    queryFn: () => fetchChatHistory(user!.id),
    enabled: !!user?.id,
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => sendChatMessage(msg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coachChat"] });
    },
    onError: (err) => {
      console.error("[coach] mutation error:", err);
      Alert.alert(
        "Coach Error",
        err instanceof Error ? err.message : String(err),
      );
      queryClient.invalidateQueries({ queryKey: ["coachChat"] });
    },
  });

  const handleSend = () => {
    if (!inputText.trim() || chatMutation.isPending) return;
    const userMsg = inputText.trim();
    setInputText("");

    // Optimistic update
    queryClient.setQueryData(
      ["coachChat", user?.id],
      (old: ChatMessage[] | undefined) => {
        const optimisticMsg: ChatMessage = {
          id: Math.random().toString(),
          role: "user",
          message: userMsg,
          created_at: new Date().toISOString(),
        };
        return [...(old || []), optimisticMsg];
      },
    );

    chatMutation.mutate(userMsg);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View
        className={`mb-4 max-w-[85%] ${isUser ? "self-end" : "self-start"}`}
      >
        {!isUser && (
          <View className="flex-row items-center mb-1">
            <View className="w-5 h-5 rounded-full bg-emerald-500 items-center justify-center mr-2">
              <Ionicons name="sparkles" size={10} color="white" />
            </View>
            <Text className="text-xs text-neutral-500 font-medium">Coach</Text>
          </View>
        )}
        <View
          className={`p-4 rounded-2xl ${
            isUser
              ? "bg-emerald-500 rounded-tr-sm"
              : "bg-neutral-100 dark:bg-neutral-900 rounded-tl-sm"
          }`}
        >
          <Text
            className={`text-base ${isUser ? "text-white" : "text-neutral-900 dark:text-white"}`}
          >
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  // Scroll to bottom when mutation completes
  useEffect(() => {
    if (!chatMutation.isPending) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  }, [chatMutation.isPending]);

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1 bg-white dark:bg-neutral-950"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="px-5 pt-4 pb-2 border-b border-neutral-100 dark:border-neutral-900 flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium text-emerald-500 mb-1">
              Nutrify AI
            </Text>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
              Coach
            </Text>
          </View>
          {messages && messages.length > 0 && (
            <Pressable
              onPress={() => {
                Alert.alert("New Chat?", "Purani chat clear ho jayegi.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                      if (!user) return;
                      try {
                        await clearChatHistory(user.id);
                        queryClient.invalidateQueries({
                          queryKey: ["coachChat"],
                        });
                      } catch {
                        Alert.alert("Error", "Failed to clear chat");
                      }
                    },
                  },
                ]);
              }}
              className="bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-full"
            >
              <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                New Chat
              </Text>
            </Pressable>
          )}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={(messages || []).filter(
              (m) => m.message && m.message.trim() !== "",
            )}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListFooterComponent={
              chatMutation.isPending ? <TypingIndicator /> : null
            }
            ListEmptyComponent={
              <View className="items-center mt-10 p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900">
                <View className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mb-4">
                  <Ionicons name="sparkles" size={24} color="#10b981" />
                </View>
                <Text className="text-lg font-bold text-neutral-900 dark:text-white mb-2 text-center">
                  I'm your AI Nutrition Coach!
                </Text>
                <Text className="text-center text-neutral-500 dark:text-neutral-400 mb-4">
                  Ask me about your diet, tell me what you're craving, or ask
                  for meal suggestions based on what you've logged today.
                </Text>
                <View className="flex-row flex-wrap gap-2 justify-center">
                  {QUICK_PROMPTS.map((prompt) => (
                    <Pressable
                      key={prompt}
                      onPress={() => {
                        setInputText(prompt);
                      }}
                      className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-2"
                    >
                      <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        {prompt}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
          />
        )}

        <View className="px-5 py-3 pb-6 border-t border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 flex-row items-end">
          <TextInput
            className="flex-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl min-h-[50px] max-h-[120px] px-5 py-3 pt-3 text-base text-neutral-900 dark:text-white"
            placeholder="Ask your coach..."
            placeholderTextColor="#9ca3af"
            multiline
            value={inputText}
            onChangeText={setInputText}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || chatMutation.isPending}
            className={`w-[50px] h-[50px] rounded-full items-center justify-center ml-2 ${
              inputText.trim() && !chatMutation.isPending
                ? "bg-emerald-500"
                : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            {chatMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons
                name="arrow-up"
                size={24}
                color={inputText.trim() ? "white" : "#9ca3af"}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
