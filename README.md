# ShiftControl

Prywatna aplikacja do planowania i ewidencji pracy zmianowej. React, TypeScript, Vite, IndexedDB. Interfejs polski, motyw ciemny i jasny. Dane pozostają w przeglądarce; serwer publikuje wyłącznie aplikację.

## Publikacja na GitHub Pages

1. Załóż konto GitHub i utwórz repozytorium, np. `ShiftControl`. Dla najprostszego bezpłatnego Pages wybierz repozytorium publiczne. Publiczny kod nie zawiera Twojej bazy z przeglądarki.
2. Dodaj pliki projektu razem z `.github/workflows/pages.yml`, `public/`, `src/`, `package.json` i `package-lock.json`. Nie dodawaj `node_modules`, `dist`, kopii JSON ani rzeczywistych PDF z grafikami. Plik `.gitignore` pomaga je wykluczyć. Przy wysyłaniu przez stronę GitHub upewnij się, że przesłano również katalog `.github`.
3. Jeżeli korzystasz z Git na komputerze, w katalogu projektu wykonaj:

   ```bash
   git init
   git add .
   git commit -m "ShiftControl — aplikacja PWA"
   git branch -M main
   git remote add origin https://github.com/TWOJ_LOGIN/ShiftControl.git
   git push -u origin main
   ```

   Zamień `TWOJ_LOGIN` i nazwę repozytorium. Nie dodawaj drugiego zdalnego `origin`, jeżeli projekt jest już podłączony do repozytorium.
4. W repozytorium otwórz **Settings → Pages → Build and deployment → Source → GitHub Actions**.
5. Otwórz **Actions → Testuj i publikuj ShiftControl**. Jeżeli pierwszy przebieg nie wystartował lub zakończył się przed włączeniem Pages, wybierz **Run workflow** na gałęzi `main`. Workflow instaluje zależności, uruchamia testy obliczeń i testy przeglądarek, buduje aplikację i publikuje wynik.
6. Po zielonym przebiegu znajdziesz link w **Settings → Pages** lub w zadaniu `deploy`. Zwykle ma postać `https://TWOJ_LOGIN.github.io/ShiftControl/`. Nazwa ścieżki jest taka sama jak nazwa repozytorium, z zachowaniem wielkości liter. Workflow ustawia ją automatycznie. Obsługuje też repozytorium `TWOJ_LOGIN.github.io` publikowane w `/`.
7. Otwórz publiczny link online i poczekaj na komunikat gotowości do pracy offline. Dopiero potem przetestuj uruchomienie bez internetu.

Repozytorium i workflow są przygotowane, ale publikacja nie została wykonana za Ciebie. Nie ma tu skonfigurowanego konta ani repozytorium docelowego.

## Instalacja na telefonie

- **iPhone:** otwórz publiczny link w Safari, wybierz **Udostępnij → Do ekranu początkowego → Dodaj**. Zależnie od wersji iOS użyj opcji otwierania jako aplikacja.
- **Android:** otwórz link w Chrome, wybierz baner „Zainstaluj” albo menu przeglądarki → **Zainstaluj aplikację / Dodaj do ekranu głównego**.
- Przeglądarka i zainstalowana aplikacja mogą mieć odrębne zasoby danych, szczególnie na iOS. Jeśli po instalacji nie widzisz danych, przenieś je pełną kopią JSON.
- PWA wymaga HTTPS (GitHub Pages zapewnia je automatycznie). Lokalnie działa także na `localhost`.

## Kopie zapasowe i przenoszenie danych

1. Otwórz **Ustawienia → Kopie zapasowe, eksport i instalacja**.
2. Wybierz **Eksport całej bazy JSON**. Zapisz pobrany plik np. w Plikach/iCloud Drive lub na komputerze. Wykonuj kopie regularnie, szczególnie przed aktualizacją, zmianą urządzenia, czyszczeniem przeglądarki i przywracaniem danych. Plik zawiera także dane wynagrodzenia.
3. Na urządzeniu docelowym otwórz ten sam ekran i wybierz **Wczytaj kopię JSON**.
4. Sprawdź datę kopii i liczbę rekordów. Nieprawidłowy lub nowszy, nieobsługiwany format jest odrzucany bez zmiany bazy. Starsze obsługiwane struktury są migrowane w pamięci.
5. Zaznacz potwierdzenie i wpisz `PRZYWRÓĆ`. Przycisk zastąpienia bazy dopiero wtedy będzie aktywny. **Anuluj** pozostawia bazę bez zmian.
6. Po zatwierdzeniu aplikacja pobiera dodatkową kopię obecnego stanu, a następnie zastępuje całą bazę w jednej transakcji i przeładowuje stronę. Jeżeli baza zmieniła się od podglądu, przywracanie zostaje przerwane. Upewnij się, że plik ochronny rzeczywiście został zapisany przez przeglądarkę.

Przywracanie zastępuje bazę, nie scala dwóch urządzeń. Publikacja strony nie synchronizuje danych. GitHub nie przechowuje bazy IndexedDB z Twojego telefonu. Kopia JSON jest sposobem ręcznego przenoszenia danych.

## Aktualizacja bez utraty danych

1. Wykonaj kopię JSON i zapisz otwarte formularze.
2. Zapisz zmiany kodu i wyślij je do `main` (`git add .`, `git commit`, `git push`) lub użyj edytora GitHub. Workflow ponownie sprawdzi i opublikuje aplikację.
3. Otwórz aplikację online. Sprawdza nową wersję przy uruchomieniu, powrocie do okna i okresowo. Może być potrzebne ponowne otwarcie po zakończeniu publikacji.
4. Przy komunikacie „Dostępna nowa wersja” potwierdź zapisanie formularzy i wybierz **Aktualizuj aplikację**. Aktualizacja wymienia pliki aplikacji i cache, nie usuwa IndexedDB. „Później” pozwala dokończyć pracę.
5. Zachowuj ten sam adres i profil przeglądarki. Inna domena, inny profil, tryb prywatny lub wyczyszczenie danych witryny mogą oznaczać inną lub pustą bazę. Wtedy przywróć JSON. Kopie ShiftControl na kilku ścieżkach tego samego origin używają tej samej nazwy bazy, dlatego nie traktuj ich jako izolowanych kont.

## Eksporty

W ustawieniach wybierz miesiąc. **Grafik PDF** zawiera plan wszystkich dni miesiąca, kody i notatki, z czcionką obsługującą polskie znaki. **Historia godzin CSV** zachowuje osobno plan, oryginalne godziny faktyczne, rozliczenie, potwierdzenie i dodatkowe minuty. **Podsumowanie miesiąca / kwartału CSV** zawiera analizę i szacunkowe składniki wynagrodzenia, braki oraz ostrzeżenia. CSV ma kodowanie UTF-8 z BOM i separator średnik; można go otworzyć w Excelu lub LibreOffice. PDF i CSV nie zastępują pełnej kopii JSON.

## Funkcje i ograniczenia

- Kalendarz wielu miesięcy i lat, ręczna edycja, kopiowanie i zaznaczanie dni, szablony, własny słownik kodów.
- Potwierdzanie faktycznych godzin, zaokrąglanie zakończenia, ręczna korekta, szybkie zakończenie i historia dodatkowego czasu.
- Lokalny import tekstowych PDF w formacie tabeli pracodawcy, wybór pracownika, podgląd i poprawki, aktualizacje planu z ochroną faktycznych godzin, historia importów. Skany wymagają OCR, którego aplikacja nie zawiera.
- Konfigurowalny system czasu pracy, bilans okresu, ręczne nominały i korekty nieobecności, nocne, szacunki nadgodzin bez podwójnego liczenia, odpoczynki, wyjątki i zmiany czasu Europe/Warsaw.
- Kalkulator brutto, miesięczne i kwartalne składniki, wykresy i filtry. Nie oblicza podatków, składek ani netto. Nie zastępuje oficjalnej listy płac ani oceny prawnej; niejednoznaczne kwalifikacje wymagają weryfikacji.
- PWA offline po pierwszym pobraniu, manifest i ikony, kontrolowane aktualizacje, pełne kopie JSON i raporty PDF/CSV.

Przeglądarka może usunąć dane lokalne przy braku miejsca lub czyszczeniu danych witryny; prośba o trwałe przechowywanie nie jest gwarancją. Utrata urządzenia bez kopii oznacza ryzyko utraty ewidencji. Tryb offline wymaga wcześniej poprawnie pobranych plików aplikacji. Testy mobilne używają emulacji Androida/Chromium i iPhone’a/WebKit, a nie fizycznych telefonów.

## Uruchomienie i testy lokalne

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Testy przeglądarkowe sprawdzają także ścieżkę repozytorium, offline, zapis, import PDF, kopie oraz eksport:

```bash
npx playwright install --with-deps chromium webkit
VITE_BASE_PATH=/shiftcontrol/ npm run build
npm run test:e2e
```

W PowerShell ustaw wcześniej `$env:VITE_BASE_PATH='/shiftcontrol/'`. Później usuń tę zmienną dla budowania w `/`. Testy PDF używają tabeli wygenerowanej w tym samym układzie, z fikcyjnym nazwiskiem pracownika. Prywatny grafik nie jest częścią projektu.

Szczegóły: [analiza czasu](docs/analiza-czasu.md), [wynagrodzenie](docs/wynagrodzenie.md).
