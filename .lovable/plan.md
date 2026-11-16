# SpeakWell — English speaking coach

Build the uploaded brief into a working English-speaking practice app, with the AI conversation modes the user requested.

## Experience
- Replace the placeholder home page with a coach dashboard and clear paths into practice, AI coaching, recordings, progress, learning plans, pronunciation, topics, and settings.
- Create an AI coach with both account-saved text conversations (a conversation list, individual conversation pages, and new conversation action) and live spoken sessions. Use the selected North American masculine voice for spoken coaching.
- Build topic-based reading and free-speaking practice, webcam/microphone recording and playback, transcript review, repeat attempts, and evidence-based assessment and progress views. Do not show fabricated scores or claim unavailable speech/video analysis is working.
- Include profile and learning preferences, privacy controls, responsive layouts, and light/dark appearance consistent with a dedicated design system.

## Service and account setup
- Enable Lovable Cloud for user accounts, profile data, saved conversations, and private learning/recording data. Keep each user's information private to their account; provide sign-in, recovery, and account-aware app views.
- Use Lovable AI for the coach and language feedback, with model requests kept server-side.
- Audit the current VoiceStudio documentation and actual speech API contracts. Build the speech-service connection and a Settings connection status only around verified APIs; show a clear not-configured state and graceful fallback until a private VoiceStudio deployment and credentials are available.
- Ask permission before camera/microphone use and before any recording upload; make recording review, download, and deletion clear. Avoid unsupported claims about phoneme accuracy or video posture analysis.

## Technical approach
- Keep the app in the existing TanStack Start structure, with dedicated page URLs for individual chat conversations and protected account pages.
- Use account-scoped persistence and access policies for profiles, chats, sessions, transcripts, assessments, and recording metadata. Store media privately; never expose service credentials in the browser.
- Use the Lovable AI Gateway for model calls and a server-side adapter for VoiceStudio. Verify real inputs, outputs, loading/error states, and account isolation before describing integrations as functional.
- Add page-specific metadata and targeted tests for core workflow rules; verify the main signed-in journey and recording/chat interfaces.

## Dependencies and limitations
- A deployed, reachable VoiceStudio service and its private connection credentials are needed to verify live transcription and batch transcription end to end. Until configured, the app must identify that dependency rather than simulate results.
- Camera and microphone recording require browser permission and a compatible device. Video-based posture analysis is not claimed unless a suitable verified capability is actually available.
