import { describe, expect, it } from 'vitest';
import type { Shift } from './db';
import { additionalMinutes, calculateBillingEnd, DEFAULT_ROUNDING, roundElapsedEnd } from './worktime';

describe('zaokrąglanie końca do kwadransa', () => {
  const cases: Array<[string,string,boolean?]> = [
    ['18:00','18:00'], ['18:01','18:15'], ['18:14','18:15'], ['18:15','18:15'],
    ['18:16','18:30'], ['18:29','18:30'], ['18:30','18:30'], ['18:31','18:45'],
    ['18:36','18:45'], ['18:45','18:45'], ['18:46','19:00'], ['23:59','00:00',true],
  ];
  it.each(cases)('%s → %s', (end, expected, nextDay = false) => {
    const result = roundElapsedEnd('09:00', end, false, DEFAULT_ROUNDING);
    expect(result.clock).toBe(expected);
    expect(result.nextDay).toBe(nextDay);
  });
  it('zachowuje oryginał, gdy zaokrąglanie jest wyłączone', () => {
    expect(roundElapsedEnd('09:00','18:36',false,{...DEFAULT_ROUNDING,enabled:false})).toMatchObject({clock:'18:36',nextDay:false});
  });
  it('obsługuje granicę dokładnie i możliwość przesunięcia o kolejny blok', () => {
    expect(roundElapsedEnd('09:00','18:15',false,{...DEFAULT_ROUNDING,boundary:'advance'})).toMatchObject({clock:'18:30'});
  });
  it('zaokrągla zegarową godzinę końca, niezależnie od minut rozpoczęcia', () => {
    expect(roundElapsedEnd('09:07','18:16',false,DEFAULT_ROUNDING)).toMatchObject({clock:'18:30'});
  });
});

describe('zmiany przechodzące przez północ', () => {
  const overnight: Shift = { date:'2026-10-28', code:'N', start:'22:00', end:'06:00', plannedStart:'22:00', plannedEnd:'06:00', actualStart:'22:00', actualEnd:'06:07', nextDay:true, actualEndNextDay:true, dayOff:false, actualConfirmed:true };
  it('zaokrągla faktyczne zakończenie następnego dnia i porównuje z planem', () => {
    const result=calculateBillingEnd(overnight,DEFAULT_ROUNDING);
    expect(result).toMatchObject({actualEnd:'06:07',billingEnd:'06:15',billingEndNextDay:true});
    expect(additionalMinutes(result)).toBe(15);
  });
  it('oblicza przykład dodatkowego czasu względem planu', () => {
    const shift: Shift={date:'2026-10-28',code:'D',start:'09:00',end:'17:00',plannedStart:'09:00',plannedEnd:'17:00',actualStart:'09:00',actualEnd:'18:36',nextDay:false,dayOff:false};
    const result=calculateBillingEnd(shift,DEFAULT_ROUNDING);
    expect(result.billingEnd).toBe('18:45');
    expect(result.actualEnd).toBe('18:36');
    expect(additionalMinutes(result)).toBe(105);
  });
});
