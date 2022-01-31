import { DateTime, Interval, Settings } from 'luxon';
import { getPeriodicityPeriods, printPeriod } from './periodicity';
const defaultZone = Settings.defaultZone;
beforeAll(() => {
  Settings.defaultZone = 'utc';
});
afterAll(() => {
  Settings.defaultZone = defaultZone;
});

describe('getPeriodicityPeriods', () => {
  describe('yearly periodicity', () => {
    describe('single occurrence', () => {
      it('middle of a month, no crossover', () => {
        const now = DateTime.fromObject({ year: 2022, month: 7, day: 1 });
        const expectedPeriods = [
          Interval.fromISO('2021-05-31T00:00:00.000Z/2022-05-31T00:00:00.000Z'),
          Interval.fromISO('2022-05-31T00:00:00.000Z/2023-05-31T00:00:00.000Z'),
          Interval.fromISO('2023-05-31T00:00:00.000Z/2024-05-31T00:00:00.000Z'),
          Interval.fromISO('2024-05-31T00:00:00.000Z/2025-05-31T00:00:00.000Z'),
        ];
        const { activePeriodIndex, periods } = getPeriodicityPeriods(
          {
            type: 'yearly',
            occurrences: [{ month: 6, date: 15 }],
          },
          15,
          1,
          2,
          now,
        );
        expect(periods).toHaveLength(expectedPeriods.length);
        expect(periods[0].interval).toEqualInterval(expectedPeriods[0]);
        expect(periods[1].interval).toEqualInterval(expectedPeriods[1]);
        expect(periods[2].interval).toEqualInterval(expectedPeriods[2]);
        expect(periods[3].interval).toEqualInterval(expectedPeriods[3]);
        expect(activePeriodIndex).toBe(1);
        expect(periods[activePeriodIndex].occurrence).toEqualDateTime(
          DateTime.fromObject({ year: now.year, month: 6, day: 15 }).endOf(
            'day',
          ),
        );
      });
      it('start of year, duration crossover', () => {
        const now = DateTime.fromObject({ year: 2022, month: 12, day: 28 });
        const expectedPeriods = [
          Interval.fromISO('2021-12-21T00:00:00.000Z/2022-12-21T00:00:00.000Z'),
          Interval.fromISO('2022-12-21T00:00:00.000Z/2023-12-21T00:00:00.000Z'),
        ];
        const { activePeriodIndex, periods } = getPeriodicityPeriods(
          {
            type: 'yearly',
            occurrences: [{ month: 1, date: 10 }],
          },
          20,
          1,
          0,
          now,
        );
        // console.log(
        //   periods.map((p) => p.interval.toISO() + ' - ' + p.occurrence.toISO()),
        // );
        expect(periods).toHaveLength(expectedPeriods.length);
        expect(periods[0].interval).toEqualInterval(expectedPeriods[0]);
        expect(periods[1].interval).toEqualInterval(expectedPeriods[1]);
        expect(activePeriodIndex).toBe(1);
        expect(periods[activePeriodIndex].occurrence).toEqualDateTime(
          DateTime.fromObject({ year: now.year + 1, month: 1, day: 10 }).endOf(
            'day',
          ),
        );
      });
    });
  });
  describe('monthly periodicity', () => {
    describe('single occurrences', () => {
      it('beginning, duration longer than month, now end of year', () => {
        const now = DateTime.fromISO('2022-12-31T00:00:00.000Z');
        const expectedPeriods = [
          Interval.fromISO('2022-10-01T00:00:00.000Z/2022-11-01T00:00:00.000Z'),
          Interval.fromISO('2022-11-01T00:00:00.000Z/2022-12-01T00:00:00.000Z'),
          Interval.fromISO('2022-12-01T00:00:00.000Z/2023-01-01T00:00:00.000Z'),
        ];
        const { activePeriodIndex, periods } = getPeriodicityPeriods(
          {
            type: 'monthly',
            occurrences: [{ date: 1 }],
          },
          45,
          2,
          0,
          now,
        );
        // console.log(periods.map(printPeriod));
        expect(periods).toHaveLength(expectedPeriods.length);
        expect(periods[0].interval).toEqualInterval(expectedPeriods[0]);
        expect(periods[1].interval).toEqualInterval(expectedPeriods[1]);
        expect(periods[2].interval).toEqualInterval(expectedPeriods[2]);
        expect(activePeriodIndex).toBe(2);
        expect(periods[activePeriodIndex].occurrence).toEqualDateTime(
          DateTime.fromObject({ year: now.year + 1, month: 1, day: 1 }).endOf(
            'day',
          ),
        );
      });
    });
    describe('two occurrences', () => {
      it('beginning and end, duration crossover', () => {
        const now = DateTime.fromISO('2022-07-01T00:00:00.000Z');
        const expectedPeriods = [
          Interval.fromISO('2022-06-13T00:00:00.000Z/2022-06-28T00:00:00.000Z'),
          Interval.fromISO('2022-06-28T00:00:00.000Z/2022-07-13T00:00:00.000Z'),
        ];
        const { activePeriodIndex, periods } = getPeriodicityPeriods(
          {
            type: 'monthly',
            occurrences: [{ date: 28 }, { date: 6 }],
          },
          15,
          1,
          0,
          now,
        );
        // console.log(periods.map(printPeriod));
        expect(periods).toHaveLength(2);
        expect(periods[0].interval).toEqualInterval(expectedPeriods[0]);
        expect(periods[1].interval).toEqualInterval(expectedPeriods[1]);
        expect(activePeriodIndex).toBe(1);
        expect(periods[activePeriodIndex].occurrence).toEqualDateTime(
          DateTime.fromObject({ year: now.year, month: 7, day: 6 }).endOf(
            'day',
          ),
        );
      });
    });
  });
});
