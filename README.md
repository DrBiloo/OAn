# OAn

OAn ist ein schlankes QR-Code-Foto-Sharing-Grundgerüst für Hochzeiten und Events. Gäste öffnen den QR-Link ohne App und Account, teilen Fotos oder Nachrichten und sehen neue Inhalte auf einer Live-Wall.

## Voraussetzungen

- Node.js 22 oder neuer
- `pnpm` 10 oder neuer
- Docker Desktop für die lokale Supabase CLI

## Lokales Setup

1. Abhängigkeiten installieren: `pnpm install`
2. Supabase CLI installieren und starten: `supabase start`
3. `.env.example` nach `.env.local` kopieren und die lokalen Werte aus `supabase status` eintragen.
4. Migration und Demo-Event anwenden: `supabase db reset`
5. Entwicklungsserver starten: `pnpm dev`
6. `http://localhost:3000/e/demo` oder `http://localhost:3000/e/demo/wall` öffnen.

Für den Magic-Link-Login muss in Supabase unter Authentication ein Mail-Provider aktiviert sein. Der Service-Role-Key gehört ausschließlich in `.env.local` und niemals in Client-Code.

## Mit Freunden teilen

Für eine öffentliche Testinstanz eignet sich Vercel:

1. Repository zu GitHub pushen und in Vercel importieren.
2. In Vercel die vier Variablen aus `.env.example` setzen. `NEXT_PUBLIC_APP_URL` muss die echte Vercel-URL ohne abschließenden Slash sein.
3. In Supabase unter Authentication → URL Configuration die Vercel-URL als Site URL und `${NEXT_PUBLIC_APP_URL}/auth/confirm` als Redirect URL eintragen.
4. Unter Authentication einen E-Mail-Provider aktivieren.
5. Die Migrationen mit `supabase db push` auf das Produktionsprojekt anwenden und den Demo-Seed nur in einer Testdatenbank ausführen.
6. Nach dem Deployment einen Event-Link wie `https://deine-domain/e/<slug>` teilen.

Der Service-Role-Key darf nur als serverseitige Vercel-Variable hinterlegt werden. Er darf nicht mit `NEXT_PUBLIC_` beginnen und nicht in Client-Komponenten importiert werden.

Free-Events erlauben 10 Fotos und laufen nach 14 Tagen ab. Paid-Events sind für 12 Monate aktiv und haben keine Fotoanzahlgrenze. Der Gastgeber kann Originalfotos und Nachrichten jederzeit als ZIP exportieren.

## Projektstruktur

- `app/[locale]`: Gastgeberseiten mit `/de` und `/tr`
- `app/e/[slug]`: sprachneutrale Gästeseiten und Live-Wall
- `app/api`: Upload-, Nachrichten- und Moderations-Route-Handler
- `components`: Gast- und Gastgeber-UI
- `lib/supabase`: Browser-, Server- und Service-Role-Clients
- `messages`: deutsche und türkische Übersetzungen
- `supabase/migrations`: Schema, RLS, Storage-Bucket und Realtime

## Befehle

```bash
pnpm dev
pnpm lint
pnpm build
pnpm format
```

## Bewusste Produktgrenzen dieses MVP

- Resumable Uploads mit TUS (TODO im Upload-Code)
- Stripe-Einmalzahlung, Google-Photos-OAuth, pg_cron-Löschung und druckbare QR-Tischkarten als PDF
- Der einfache Rate-Limiter ist pro Serverprozess; für mehrere Instanzen sollte er durch Upstash/Redis oder eine Datenbankfunktion ersetzt werden.
