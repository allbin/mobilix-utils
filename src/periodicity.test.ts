import { DateTime, Interval, Settings } from 'luxon';
import {
  CheckIn,
  getPeriodicityPeriods,
  getPeriodStatus,
  PeriodicityPeriod,
} from './periodicity';

const defaultZone = Settings.defaultZone;
beforeAll(() => {
  Settings.defaultZone = 'utc';
});
afterAll(() => {
  Settings.defaultZone = defaultZone;
});

describe('getPeriodicityPeriods():', () => {
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
    describe('multiple occurrences', () => {
      it('start and end of year, duration crossover', () => {
        const now = DateTime.fromObject({ year: 2022, month: 12, day: 25 });
        const expectedPeriods = [
          Interval.fromISO('2022-12-20T00:00:00.000Z/2023-11-25T00:00:00.000Z'),
          Interval.fromISO('2023-11-25T00:00:00.000Z/2023-12-20T00:00:00.000Z'),
        ];
        const { activePeriodIndex, periods } = getPeriodicityPeriods(
          {
            type: 'yearly',
            occurrences: [
              { month: 12, date: 20 },
              { month: 1, date: 10 },
            ],
          },
          25,
          0,
          1,
          now,
        );
        expect(periods).toHaveLength(expectedPeriods.length);
        expect(periods[0].interval).toEqualInterval(expectedPeriods[0]);
        expect(periods[1].interval).toEqualInterval(expectedPeriods[1]);
        expect(activePeriodIndex).toBe(0);
        expect(periods[activePeriodIndex].occurrence).toEqualDateTime(
          DateTime.fromObject({ year: 2023, month: 1, day: 10 }).endOf('day'),
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
    describe('multiple occurrences', () => {
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

  describe('edge-case parameters', () => {
    it('should return single day intervals if duration is zero', () => {
      const { periods, activePeriodIndex } = getPeriodicityPeriods(
        { type: 'monthly', occurrences: [{ date: 15 }] },
        0,
        1,
        0,
        DateTime.fromISO('2022-06-15T00:00:00.000Z'),
      );

      expect(periods).toHaveLength(2);
      expect(activePeriodIndex).toBe(1);

      expect(periods[0].interval.start.toISO()).toEqual(
        '2022-05-15T00:00:00.000Z',
      );
      expect(periods[0].interval.end.toISO()).toEqual(
        '2022-06-15T00:00:00.000Z',
      );

      expect(periods[1].interval.start.toISO()).toEqual(
        '2022-06-15T00:00:00.000Z',
      );
      expect(periods[1].interval.end.toISO()).toEqual(
        '2022-07-15T00:00:00.000Z',
      );
    });

    it('should return a single period if both count params are zero', () => {
      const { periods, activePeriodIndex } = getPeriodicityPeriods(
        { type: 'monthly', occurrences: [{ date: 15 }] },
        7,
        0,
        0,
        DateTime.fromISO('2022-06-10T00:00:00.000Z'),
      );

      expect(periods).toHaveLength(1);
      expect(activePeriodIndex).toBe(0);

      expect(periods[0].interval.start.toISO()).toEqual(
        '2022-06-08T00:00:00.000Z',
      );
      expect(periods[0].interval.end.toISO()).toEqual(
        '2022-07-08T00:00:00.000Z',
      );
    });
  });
});

describe('getPeriodStatus():', () => {
  it('returns executed on_time', () => {
    const period: PeriodicityPeriod = {
      interval: Interval.fromISO(
        '2021-05-31T00:00:00.000Z/2022-05-31T00:00:00.000Z',
      ),
      occurrence: DateTime.fromISO('2021-06-30T00:00:00.000Z'),
    };
    const checkIns: CheckIn[] = [
      { timestamp: DateTime.fromISO('2021-06-10T00:00:00.000Z') },
    ];
    const status = getPeriodStatus(period, checkIns);

    expect(status.executed).toBe('on_time');
    expect(status.remarks.length).toBe(0);
  });

  it('returns executed late, with remark', () => {
    const period: PeriodicityPeriod = {
      interval: Interval.fromISO(
        '2021-05-31T00:00:00.000Z/2022-05-31T00:00:00.000Z',
      ),
      occurrence: DateTime.fromISO('2021-06-30T00:00:00.000Z'),
    };
    const checkIns: CheckIn[] = [
      {
        timestamp: DateTime.fromISO('2021-08-10T00:00:00.000Z'),
        result: 'workorder',
      },
    ];
    const status = getPeriodStatus(period, checkIns);

    expect(status.executed).toBe('late');
    expect(status.remarks.length).toBe(1);
    expect(status.remarks[0]).toBe('workorder');
  });

  it('remark order matches incoming checkins', () => {
    const status = getPeriodStatus(
      {
        interval: Interval.fromISO(
          '2022-06-01T00:00:00.000Z/2022-07-01T00:00:00.000Z',
        ),
        occurrence: DateTime.fromISO('2022-06-15T00:00:00.000Z'),
      },
      [
        {
          timestamp: DateTime.fromISO('2022-01-01T00:00:00.000Z'),
          result: 'error_report',
        },
        {
          timestamp: DateTime.fromISO('2022-06-30T00:00:00.000Z'),
          result: 'workorder',
        },
        {
          timestamp: DateTime.fromISO('2022-06-20T00:00:00.000Z'),
        },
        {
          timestamp: DateTime.fromISO('2022-06-10T00:00:00.000Z'),
          result: 'police_report',
        },
        {
          timestamp: DateTime.fromISO('2022-12-01T00:00:00.000Z'),
          result: 'error_report',
        },
      ],
    );

    expect(status.remarks).toHaveLength(2);
    expect(status.remarks[0]).toBe('workorder');
    expect(status.remarks[1]).toBe('police_report');
    expect(status.executed).toBe('on_time');
  });

  // it('what happens with no checkins yet', () => {
  //   const status = getPeriodStatus(
  //     {
  //       interval: Interval.fromISO(
  //         '2021-05-31T00:00:00.000Z/2022-05-31T00:00:00.000Z',
  //       ),
  //       occurrence: DateTime.fromISO('2021-06-30T00:00:00.000Z'),
  //     },
  //     [],
  //   );
  //   expect(status.remarks).toHaveLength(0);
  //   expect(status.executed).toBe('missed');
  // });
});
