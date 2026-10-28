# Wynagrodzenie i statystyki — Etap 5

Otwórz „Wynagrodzenie → Ustawienia wynagrodzenia”. Ustawienia są zapisywane w IndexedDB, osobno dla każdego miesiąca i okresu. Domyślna podstawa to 6050 zł brutto. Wszystkie wyniki są szacunkowe.

## Stawki i miesięczna wypłata

Stawka bazowa = miesięczna podstawa / ręczny nominał miesiąca albo wpisana stała stawka godzinowa. Normalna stawka nadgodzin dodatkowo uwzględnia wskazane miesięczne składniki podstawy normalnego wynagrodzenia podzielone przez nominał. Parametr ten jest podstawą stawki, nie osobną pozycją wypłaty: należny składnik wpisz także w składnikach wynagrodzenia. Korekta wypłacanej podstawy zmienia kwotę zasadniczą, a nie automatycznie podstawę dodatków.

Normalne wynagrodzenie za nadgodziny dobowe = godziny dobowe z analizy × normalna stawka. Dodatki = ręcznie przypisane godziny × stawka bazowa × wybrany procent. Nie można przypisać łącznie więcej godzin niż nadgodzin dobowych. Nieprzypisane godziny są oznaczone do weryfikacji, a ich dodatki nie trafiają do sumy znanych składników. Niedziela lub święto nie wybiera automatycznie dodatku.

Dodatek nocny korzysta z godzin nocnych analizy (domyślnie 22:00–06:00). Może mieć wpisaną kwotę za godzinę lub formułę: ręczna miesięczna podstawa referencyjna / nominał × procent. Podstawę referencyjną, np. właściwą podstawę stosowaną w zakładzie, należy wpisać samodzielnie. Aplikacja nie zakłada, że jest nią pensja zasadnicza.

Premia i inne składniki są dodawane zgodnie z wybranym terminem i zakresem. Mogą być jednorazowe dla miesiąca/kwartału albo powtarzalne. Kwoty obliczamy z niezaokrąglonej stawki, następnie zaokrąglamy każdy składnik do grosza i sumujemy.

## Po kwartale

Godziny średniotygodniowe pochodzą z bilansu całego okresu po odjęciu nadgodzin dobowych. Ich normalne wynagrodzenie i dodatek są pokazane wyłącznie w części kwartalnej, razem z innymi składnikami kwartalnymi. Wybierz miesiąc stawki i zweryfikuj właściwy dodatek. Nieznany dodatek nie jest zastępowany automatycznie wartością 100%.

Wyniki w trakcie okresu pozostają wstępne. Wybór miesiąca stawki jest założeniem kalkulatora, które trzeba dopasować do zasad firmy. Filtr pojedynczego miesiąca nie zmienia rozliczenia średniotygodniowego całego okresu.

## Nominały i filtry

Nominały płacowe początkowo korzystają z zapisanych nominałów obecnego okresu. Edycja nominału w kalkulatorze nie zmienia ustawień źródłowych. Dla innych kwartałów wpisz brakujące nominały miesięczne i kwartalny ręcznie. Brak nominału nie powoduje podstawienia automatycznie wyliczonej liczby godzin.

W statystykach wybierz bieżący ustawiony okres albo kwartał i rok. Filtr miesiąca wybiera wiersze i wyróżnia miesiąc na wykresach porównawczych. Wykres miesięcznych kwot nie zawiera wypłat odroczonych do końca kwartału. Wskaźnik średniotygodniowy dotyczy wyłącznie całego okresu.

## Granice szacunku

Podstawa jest domyślnie pełnym miesięcznym wynagrodzeniem. Nieobecność koryguje wymiar w analizie czasu, lecz nie wyznacza automatycznie wynagrodzenia chorobowego, urlopowego ani potrącenia. Wpisz odpowiednią korektę podstawy i inne składniki. Kalkulator nie wylicza podatków, składek ani kwoty netto. Rekompensata czasem wolnym i ostateczna kwalifikacja dodatków wymagają sprawdzenia. Kwota ze znanych składników może być częściowa, gdy są braki w danych. Narzędzie nie zastępuje oficjalnej listy płac.
