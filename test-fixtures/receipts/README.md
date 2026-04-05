# Test fixtures pro document processor

Přidej testovací obrázky do složek podle očekávaného výsledku:

- `clear/` — čisté, ostré účtenky/faktury → očekávaný výstup: `ok`
- `warning/` — čitelné, ale některá pole nejistá → očekávaný výstup: `warning`
- `rejected-blurry/` — rozmazané → očekávaný výstup: `rejected` (blurry_image)
- `rejected-dark/` — tmavé fotky → očekávaný výstup: `rejected` (dark_image)
- `rejected-cropped/` — useknuté → očekávaný výstup: `rejected` (cropped_image / unreadable_date)
- `rejected-not-receipt/` — náhodné fotky → očekávaný výstup: `rejected` (not_a_document)

## Jak vytvořit testovací sadu

1. Vyfoť jednu čistou účtenku a ulož do `clear/`
2. Kopíruj ji a aplikuj filtry:
   - Gaussian blur (radius 5+) → `rejected-blurry/`
   - Snížení jasu na 20-30% → `rejected-dark/`
   - Crop horní polovinu (bez data) → `rejected-cropped/`
3. Přidej foto krajiny/jídla → `rejected-not-receipt/`
4. Přidej účtenku s částečně zakrytým textem → `warning/`

## Spuštění testů

```bash
npx tsx scripts/test-document-processor.ts
```
