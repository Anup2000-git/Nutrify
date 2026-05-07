# Nutrify

An AI-powered nutrition tracking app for India — log food via photo or text, get auto-calculated macros & micros, and follow a personalized AI coach for weight loss, gain, or general health goals.

> **Note:** Project folder is still `Nutrifyr` for now. Rename to `Nutrify` pending.

## Features (planned)

- **Photo-based food logging** — snap a meal, AI extracts food name, quantity, calories, macros, micros
- **Text logging + barcode scan** — fallback for non-photo entries
- **Auto meal-type tagging** — breakfast / lunch / snack / dinner detected via time + food
- **Personalized AI coach** — adaptive same-day suggestions ("breakfast heavy tha, lunch ye karo") + weekly/monthly roadmaps
- **Persona-aware coaching** — gym goer, student, mother, senior, etc. get different recommendations
- **Indian regional foods** — North, South, East, NE, West India coverage (IFCT 2017 + LLM fallback)
- **Goal tracking** — weight, BMI, calorie/macro targets, progress charts
- **Full history** — view any past day's logs with date-based browsing

## Tech stack

- **Mobile:** React Native + Expo (Android-first, iOS supported)
- **Styling:** NativeWind (Tailwind for RN)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI:** OpenAI GPT-4o (vision + quick chat) + GPT-5 (deep coaching)
- **Nutrition data:** IFCT 2017 (Indian) + USDA FoodData Central + Open Food Facts

## Getting Started

### Prerequisites

- Node.js v20 LTS or higher
- npm or pnpm
- Expo Go app on Android phone (for live testing)
- Supabase account (free tier)
- OpenAI API key (GPT-4o + GPT-5 access)

### Installation

```bash
git clone https://github.com/Anup2000-git/Nutrifyr.git
cd Nutrifyr
npm install
```

Copy `.env.example` to `.env` and fill in your Supabase + OpenAI credentials.

Start the dev server:

```bash
npx expo start
```

Scan the QR code with Expo Go on your Android phone.

## Project structure (Phase 0)

```
Nutrify/
├── app/                # Expo Router screens
├── src/
│   ├── components/     # Reusable UI components
│   ├── lib/            # Supabase + OpenAI clients
│   ├── services/       # Business logic (food logging, coach, etc.)
│   ├── hooks/          # Custom React hooks
│   ├── types/          # Shared TypeScript types
│   └── constants/      # App-wide constants
├── assets/             # Images, fonts, icons
├── supabase/           # SQL migrations + edge functions
└── docs/               # Architecture, schema, decisions
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Status

🚧 **Phase 0 — Project setup in progress.**

## Contact

Project Link: https://github.com/Anup2000-git/Nutrifyr
