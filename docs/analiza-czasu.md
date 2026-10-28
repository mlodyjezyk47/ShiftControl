# Analiza czasu — Etap 4

Otwórz „Analiza czasu → Reguły i korekty”, sprawdź system oraz parametry i zapisz je. Daty okresu i cztery ręczne nominały pozostają w ustawieniach aplikacji. Analiza nie zmienia tych nominałów. Domyślne parametry systemu są robocze, dopóki ich nie zapiszesz.

## Dane i obliczenia

- Wykonanie obejmuje wyłącznie potwierdzone, poprawne przedziały, których koniec już nastąpił. Niepotwierdzone wartości skopiowane z planu nie są dowodem pracy.
- Strefa domyślna to Europe/Warsaw, niezależnie od ustawień telefonu. Faktyczne godziny i odpoczynki mierzymy czasem rzeczywiście upływającym. Plan jest nominalną różnicą godzin zegarowych. Zmiana czasu może dawać różnicę; pojawia się ostrzeżenie.
- Godzina pominięta podczas wiosennej zmiany czasu jest błędem. Dla dwukrotnej godziny jesienią trzeba wybrać wystąpienie. Przycisk „Zakończ zmianę teraz” zapisuje właściwe wystąpienie na podstawie bieżącego momentu.
- W podstawowym systemie próg dobowy to skonfigurowana norma (domyślnie 8 h). W równoważnym: większa z normy i planowanej długości zmiany, ograniczona skonfigurowanym maksimum. Krótki plan nie obniża automatycznie normy.
- Praca jest dzielona na niepokrywające się 24-godzinne doby pracownicze. Ponowne wejście w tej samej dobie jest do niej dołączane. Wcześniejsze rozpoczęcia są sygnalizowane. Formalny ruchomy rozkład ma osobną opcję i wymaga weryfikacji jego podstawy.
- Średniotygodniowe to dodatnia reszta całego okresu: faktyczna praca minus nadgodziny dobowe minus ręczny wymiar po korektach. W ten sposób minuty nadgodzin dobowych nie trafiają do średniotygodniowych. Nie jest to oddzielny limit naliczany co tydzień.
- Pozostały wymiar to dodatnia różnica pomiędzy wymiarem po korektach a pracą bez nadgodzin dobowych. W trakcie okresu jest czasem do wypracowania, po zakończeniu szacunkiem niedopracowania.
- Bilans dodatkowy porównuje czas rozliczeniowy z planem zmian, dla których istnieje potwierdzona praca i poprawne rozliczenie. Ręczne korekty końca rozliczeniowego pokazujemy osobno jako różnicę względem automatycznego zaokrąglenia. Nie powiększają automatycznie nadgodzin.
- Czas nocny jest przekrojem faktycznych godzin, może pokrywać się z nadgodzinami. Nie należy dodawać go ponownie do sumy pracy. Sama niedziela lub święto nie powodują nadgodzin.
- Przy nakładających się zapisach wykonanie liczymy jako sumę unikalnych przedziałów i zgłaszamy problem danych.
- Bilans okresu przycina przedziały do jego granic; miesięczne zestawienia przypisują zmianę do jej daty rozpoczęcia. Plan graniczny jest proporcjonalnie przypisywany do części w okresie. Miesięcznych podsumowań nie należy wtedy traktować jako prostego rozbicia obciętych przedziałów okresu.

## Nieobecności i kompletność

Wpisz korektę ze znakiem i uzasadnieniem: np. −12 h dla nieobecności w zaplanowanej 12-godzinnej zmianie, jeżeli taka korekta jest właściwa. Nominały źródłowe pozostają zapisane, a analiza pokazuje bazę, korektę i wynik. Nie odejmuj tych samych godzin ponownie w nominale. Korekta nieobecności sama nie potwierdza odpoczynku ani nie usuwa zmiany.

Puste dni nie oznaczają automatycznie wolnego. Możesz potwierdzić kompletność ewidencji w wybranym zakresie. Wtedy puste dni w tym zakresie są traktowane jako brak pracy. Istniejące zmiany z niepotwierdzonymi godzinami nadal wymagają potwierdzenia. Zbierz także dane z sąsiednich dni dla odpoczynków na granicach.

## Odpoczynki i wyjątki

Domyślnie sprawdzamy najdłuższą nieprzerwaną przerwę w dobie pracowniczej względem 11 h. Tygodnie to siedem kolejnych dni kalendarzowych od początku okresu, z minimum 35 h. Granice tygodni uwzględniają zmianę czasu. Odpoczynek przecinający granicę tygodnia jest osobnym przypadkiem do weryfikacji, aby nie uznać jednej przerwy automatycznie za dwa odpoczynki. Niepełny ostatni tydzień i niekompletne dane mają osobny status.

Można odnotować wyjątek związany z zarządzaniem, akcją ratowniczą/awarią lub, dla odpoczynku tygodniowego, przejściem na inną zmianę. Zgłoszony wyjątek tygodniowy ma kontrolę co najmniej 24 h. Wyjątek pozostaje widoczny i wymaga weryfikacji podstawy; nie ukrywa niedoboru.

Opcjonalny przedział odpoczynku równoważnego sprawdzamy pod kątem nakładania się na pracę, kompletności danych, długości i położenia w okresie. Sama wolna przerwa nie dowodzi prawidłowego udzielenia odpoczynku równoważnego. Termin, wymaganą długość i podstawę trzeba zweryfikować, zwłaszcza w systemach ze zmianami powyżej 12 h.

Wyniki są wstępne w trakcie okresu, przy brakach danych lub niepotwierdzonej konfiguracji. Po zakończeniu i uzupełnieniu ewidencji nadal są szacunkiem, a nie definitywną oceną prawną. Rekompensata dniem wolnym, szczególne regulacje branżowe i prawna kwalifikacja konkretnych zdarzeń wymagają osobnej oceny.
