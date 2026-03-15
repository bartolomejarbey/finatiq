# Fachmani.org

## Projekt
Česká platforma propojující zákazníky s profesionály.

## Tech stack
- Next.js 16 (App Router) — kód je v src/app/
- Supabase (auth + database)
- Tailwind CSS
- Vercel hosting

## Pravidla
- NIKDY neměň soubory které nesouvisí s aktuálním úkolem
- NIKDY nepřepisuj existující kód jiným projektem
- Vždy po změnách spusť npm run build a ověř že build prochází
- Před commitem ukaž git diff
- Pracuj POUZE ve složce src/
- Design: cyan-500/blue-500 gradient, rounded-2xl, konzistentní s /cenik

## Struktura
src/app/ — hlavní aplikace
src/lib/ — utility a Supabase klient
src/components/ — sdílené komponenty
