# 🥗 Nutrify — AI Nutrition Coach for Indian Diets

An AI-powered mobile app that makes nutrition tracking effortless for Indian users: **snap a photo of your meal**, let GPT-4o vision identify the food and estimate calories and macros, then get **personalised coaching** from an AI coach that adapts to your goal and lifestyle.

![React Native](https://img.shields.io/badge/React%20Native-0.81-20232A?logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Edge%20Functions-3FCF8E?logo=supabase&logoColor=white)
![Azure OpenAI](https://img.shields.io/badge/Azure%20OpenAI-GPT--4o%20%7C%20GPT--5-0078D4?logo=openai&logoColor=white)
![Status](https://img.shields.io/badge/status-in%20active%20development-yellow)

## ✨ Features

| | Feature | Details |
|---|---|---|
| 📸 | **Photo food logging** | Take a picture → GPT-4o vision detects each food item with quantity, calories, protein, carbs, fat and fiber |
| 🔎 | **Search, barcode & recent meals** | Fallback logging via food search, barcode scan or one-tap re-logging of recent meals |
| 🕒 | **Auto meal-type detection** | Breakfast / lunch / snack / dinner inferred from time of day and food |
| 🧠 | **AI Coach** | Chat-based coach (GPT-5 reasoning model) that gives same-day adjustments and longer-term guidance |
| 👤 | **Persona-aware onboarding** | Goal, activity level, diet type and life stage drive calorie and macro targets |
| 🇮🇳 | **Indian food coverage** | Regional foods backed by IFCT 2017 nutrition data, with an AI lookup fallback |
| 📈 | **Progress tracking** | Daily summaries, weight log, goals and progress charts |
| 📶 | **Offline-first logging** | Meals are queued locally and synced when the network returns |

## 🏗️ Architecture

```
 ┌──────────────────────────┐        ┌───────────────────────────────────────┐
 │  Mobile App (Expo / RN)  │        │               Supabase                │
 │                          │  JWT   │                                       │
 │  Expo Router screens     ├───────►│  Auth  ·  Postgres (RLS)  ·  Storage  │
 │  Zustand + React Query   │        │                                       │
 │  Offline sync queue      │        │  Edge Functions (Deno)                │
 └──────────────────────────┘        │   ├─ analyze-food-photo ──┐           │
                                     │   ├─ ai-coach-chat ───────┼──► Azure  │
                                     │   └─ generate-suggestion ─┘   OpenAI  │
                                     └───────────────────────────────────────┘
```

**Security by design:** the AI API keys **never ship in the mobile app**. The client calls Supabase Edge Functions, which verify the user's JWT, check that the user owns the photo being analysed, create a short-lived signed URL and only then call Azure OpenAI from the server. Data is protected with Postgres Row-Level Security policies.

## 📁 Project Structure

```
app/                    # Expo Router screens
├── (auth)/             # Login, signup
├── (onboarding)/       # Goal, stats, activity, diet, life stage, review
├── (tabs)/             # Home, Log, Coach, Progress, Profile
└── log-*.tsx           # Camera, photo confirm, barcode, search, recent
src/
├── modules/            # Feature modules (food-logging, ai-coach, tracking,
│                       #   nutrition-db, onboarding, auth, analytics …)
├── lib/                # Supabase client, AI wrappers, offline queue
├── constants/          # Personas, prompts, theme
└── types/              # Shared TypeScript models
supabase/
├── migrations/         # Schema, storage policies, RLS
├── functions/          # Edge functions (vision, coach, suggestions)
└── seeds/              # Nutrition seed data
docs/                   # Architecture, schema and setup notes
```

## 🚀 Getting Started

**Prerequisites:** Node.js 20+, a Supabase project, an Azure OpenAI resource with GPT-4o (and optionally GPT-5) deployments, and the Expo Go app on your phone.

```bash
git clone https://github.com/Anup2000-git/Nutrify.git
cd Nutrify
npm install

cp .env.example .env      # add your Supabase URL + anon key
npx expo start            # scan the QR code with Expo Go
```

The Azure OpenAI credentials are read only by the Supabase Edge Functions and are never bundled into the app. See [`docs/setup.md`](docs/setup.md) for the full setup.

## 🛠️ Tech Stack

**Mobile:** React Native · Expo · Expo Router · TypeScript · NativeWind (Tailwind) · Zustand · TanStack Query · Reanimated
**Backend:** Supabase (PostgreSQL, Auth, Storage, Row-Level Security, Deno Edge Functions)
**AI:** Azure OpenAI GPT-4o (vision) · GPT-5 (coaching)
**Data:** IFCT 2017 (Indian Food Composition Tables) · USDA FoodData Central · Open Food Facts

## 🗺️ Roadmap

- [x] Auth + persona-based onboarding with calculated targets
- [x] Photo, search, barcode and recent-meal logging
- [x] AI coach chat and daily suggestions
- [x] Progress tracking and offline sync
- [ ] Weekly / monthly AI-generated plans
- [ ] Play Store release
