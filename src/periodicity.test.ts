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
          'utc',
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
          'utc',
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
          'utc',
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
          'utc',
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
          'utc',
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
        'utc',
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
        'utc',
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

  describe('day overflow is clamped to the last day of the month', () => {
    it('monthly on the 31st renders in April', () => {
      const { periods, activePeriodIndex } = getPeriodicityPeriods(
        { type: 'monthly', occurrences: [{ date: 31 }] },
        10,
        1,
        1,
        DateTime.fromISO('2026-04-25T10:00:00.000Z'),
        'utc',
      );

      expect(activePeriodIndex).toBe(1);
      expect(periods).toHaveLength(3);
      expect(periods[0].interval).toEqualInterval(
        Interval.fromISO('2026-03-21T00:00:00.000Z/2026-04-20T00:00:00.000Z'),
      );
      expect(periods[1].interval).toEqualInterval(
        Interval.fromISO('2026-04-20T00:00:00.000Z/2026-05-21T00:00:00.000Z'),
      );
      expect(periods[2].interval).toEqualInterval(
        Interval.fromISO('2026-05-21T00:00:00.000Z/2026-06-20T00:00:00.000Z'),
      );
      expect(periods[0].occurrence).toEqualDateTime(
        DateTime.fromISO('2026-03-31T00:00:00.000Z').endOf('day'),
      );
      expect(periods[1].occurrence).toEqualDateTime(
        DateTime.fromISO('2026-04-30T00:00:00.000Z').endOf('day'),
      );
      expect(periods[2].occurrence).toEqualDateTime(
        DateTime.fromISO('2026-05-31T00:00:00.000Z').endOf('day'),
      );
    });

    it('monthly on the 30th falls on Feb 28 in a non-leap year', () => {
      const { periods, activePeriodIndex } = getPeriodicityPeriods(
        { type: 'monthly', occurrences: [{ date: 30 }] },
        10,
        0,
        0,
        DateTime.fromISO('2026-02-20T10:00:00.000Z'),
        'utc',
      );

      expect(activePeriodIndex).toBe(0);
      expect(periods[0].interval).toEqualInterval(
        Interval.fromISO('2026-02-18T00:00:00.000Z/2026-03-20T00:00:00.000Z'),
      );
      expect(periods[0].occurrence).toEqualDateTime(
        DateTime.fromISO('2026-02-28T00:00:00.000Z').endOf('day'),
      );
    });

    it('yearly on Feb 29 renders in 2027 and uses Feb 29 again in 2028', () => {
      const { periods, activePeriodIndex } = getPeriodicityPeriods(
        { type: 'yearly', occurrences: [{ month: 2, date: 29 }] },
        14,
        1,
        1,
        DateTime.fromISO('2027-03-10T10:00:00.000Z'),
        'utc',
      );

      expect(activePeriodIndex).toBe(1);
      expect(periods).toHaveLength(3);
      expect(periods[0].interval).toEqualInterval(
        Interval.fromISO('2026-02-14T00:00:00.000Z/2027-02-14T00:00:00.000Z'),
      );
      expect(periods[1].interval).toEqualInterval(
        Interval.fromISO('2027-02-14T00:00:00.000Z/2028-02-15T00:00:00.000Z'),
      );
      expect(periods[2].interval).toEqualInterval(
        Interval.fromISO('2028-02-15T00:00:00.000Z/2029-02-14T00:00:00.000Z'),
      );
      expect(periods[0].occurrence).toEqualDateTime(
        DateTime.fromISO('2026-02-28T00:00:00.000Z').endOf('day'),
      );
      expect(periods[1].occurrence).toEqualDateTime(
        DateTime.fromISO('2027-02-28T00:00:00.000Z').endOf('day'),
      );
      expect(periods[2].occurrence).toEqualDateTime(
        DateTime.fromISO('2028-02-29T00:00:00.000Z').endOf('day'),
      );
    });

    it('two occurrences that clamp to the same day collapse into one period', () => {
      const { periods, activePeriodIndex } = getPeriodicityPeriods(
        { type: 'monthly', occurrences: [{ date: 30 }, { date: 31 }] },
        5,
        1,
        1,
        DateTime.fromISO('2026-02-25T12:00:00.000Z'),
        'utc',
      );

      expect(activePeriodIndex).toBe(1);
      expect(periods).toHaveLength(3);
      expect(periods[0].occurrence).toEqualDateTime(
        DateTime.fromISO('2026-01-31T00:00:00.000Z').endOf('day'),
      );
      expect(periods[1].interval).toEqualInterval(
        Interval.fromISO('2026-02-23T00:00:00.000Z/2026-03-25T00:00:00.000Z'),
      );
      expect(periods[1].occurrence).toEqualDateTime(
        DateTime.fromISO('2026-02-28T00:00:00.000Z').endOf('day'),
      );
      expect(periods[2].occurrence).toEqualDateTime(
        DateTime.fromISO('2026-03-30T00:00:00.000Z').endOf('day'),
      );
    });

    it('monthly occurrences keep their order across the year boundary', () => {
      const { periods, activePeriodIndex } = getPeriodicityPeriods(
        { type: 'monthly', occurrences: [{ date: 31 }, { date: 10 }] },
        5,
        2,
        1,
        DateTime.fromISO('2027-01-05T12:00:00.000Z'),
        'utc',
      );

      expect(activePeriodIndex).toBe(2);
      expect(periods.map((p) => p.occurrence.toISODate())).toEqual([
        '2026-12-10',
        '2026-12-31',
        '2027-01-10',
        '2027-01-31',
      ]);
    });
  });

  describe('unusable stored plans never throw', () => {
    it('empty occurrences returns no periods and activePeriodIndex -1', () => {
      const result = getPeriodicityPeriods(
        { type: 'monthly', occurrences: [] },
        10,
        1,
        0,
        DateTime.fromISO('2026-04-10T10:00:00.000Z'),
        'utc',
      );

      expect(result).toEqual({ periods: [], activePeriodIndex: -1 });
    });

    it('missing, null or non-numeric occurrence data does not throw', () => {
      const now = DateTime.fromISO('2026-04-10T10:00:00.000Z');
      const stored = (occurrences: unknown): PeriodicityPeriods =>
        getPeriodicityPeriods(
          { type: 'monthly', occurrences: occurrences as [] },
          10,
          1,
          0,
          now,
          'utc',
        );
      const empty = { periods: [], activePeriodIndex: -1 };
      expect(stored(undefined)).toEqual(empty);
      expect(stored(null)).toEqual(empty);
      expect(stored({})).toEqual(empty);
      expect(stored([null])).toEqual(empty);
      expect(stored([{ date: 'x' }])).toEqual(empty);

      const textMonth = getPeriodicityPeriods(
        {
          type: 'yearly',
          occurrences: [{ month: 'foo' as unknown as number, date: 1 }],
        },
        10,
        1,
        0,
        DateTime.fromISO('2026-04-10T10:00:00.000Z'),
        'utc',
      );
      expect(textMonth).toEqual({ periods: [], activePeriodIndex: -1 });
    });

    it('numeric strings from old stored plans still work', () => {
      const now = DateTime.fromISO('2026-04-10T10:00:00.000Z');
      const asStrings = getPeriodicityPeriods(
        {
          type: 'yearly',
          occurrences: [
            {
              month: '6' as unknown as number,
              date: '15' as unknown as number,
            },
          ],
        },
        10,
        1,
        0,
        now,
        'utc',
      );
      const asNumbers = getPeriodicityPeriods(
        { type: 'yearly', occurrences: [{ month: 6, date: 15 }] },
        10,
        1,
        0,
        now,
        'utc',
      );
      expect(asStrings.periods).toHaveLength(asNumbers.periods.length);
      asStrings.periods.forEach((p, i) => {
        expect(p.interval).toEqualInterval(asNumbers.periods[i].interval);
      });
    });

    it('occurrences without a valid date are dropped, the rest are kept', () => {
      const broken = getPeriodicityPeriods(
        {
          type: 'yearly',
          occurrences: [
            { month: 13, date: 1 },
            { month: 6, date: 0 },
          ],
        },
        10,
        1,
        0,
        DateTime.fromISO('2026-04-10T10:00:00.000Z'),
        'utc',
      );
      expect(broken).toEqual({ periods: [], activePeriodIndex: -1 });

      const mixed = getPeriodicityPeriods(
        {
          type: 'yearly',
          occurrences: [
            { month: 13, date: 1 },
            { month: 6, date: 15 },
          ],
        },
        10,
        1,
        0,
        DateTime.fromISO('2026-04-10T10:00:00.000Z'),
        'utc',
      );
      const onlyValid = getPeriodicityPeriods(
        { type: 'yearly', occurrences: [{ month: 6, date: 15 }] },
        10,
        1,
        0,
        DateTime.fromISO('2026-04-10T10:00:00.000Z'),
        'utc',
      );
      expect(mixed.activePeriodIndex).toBe(onlyValid.activePeriodIndex);
      expect(mixed.periods).toHaveLength(onlyValid.periods.length);
      mixed.periods.forEach((p, i) => {
        expect(p.interval).toEqualInterval(onlyValid.periods[i].interval);
        expect(p.occurrence).toEqualDateTime(onlyValid.periods[i].occurrence);
      });
    });
  });

  describe('zone', () => {
    const now = DateTime.fromISO('2026-04-10T10:00:00.000Z');
    const plan = { type: 'monthly' as const, occurrences: [{ date: 15 }] };

    it('defaults to Europe/Stockholm regardless of the zone of now', () => {
      const { periods, activePeriodIndex } = getPeriodicityPeriods(
        plan,
        5,
        0,
        0,
        now,
      );
      const { start, end } = periods[activePeriodIndex].interval;
      expect(start?.zoneName).toBe('Europe/Stockholm');
      expect(start?.toUTC().toISO()).toBe('2026-04-09T22:00:00.000Z');
      expect(end?.toUTC().toISO()).toBe('2026-05-09T22:00:00.000Z');
      expect(periods[activePeriodIndex].occurrence.toUTC().toISO()).toBe(
        '2026-04-15T21:59:59.999Z',
      );
    });

    it('does not trust the zone of now', () => {
      const fromNewYork = getPeriodicityPeriods(
        plan,
        5,
        0,
        0,
        now.setZone('America/New_York'),
      );
      const fromUtc = getPeriodicityPeriods(plan, 5, 0, 0, now);
      expect(fromNewYork.periods[0].interval).toEqualInterval(
        fromUtc.periods[0].interval,
      );
      expect(fromNewYork.periods[0].interval.end?.zoneName).toBe(
        'Europe/Stockholm',
      );
    });

    it('uses the zone passed by the caller', () => {
      const { periods, activePeriodIndex } = getPeriodicityPeriods(
        plan,
        5,
        0,
        0,
        now,
        'utc',
      );
      const { start, end } = periods[activePeriodIndex].interval;
      expect(start?.toISO()).toBe('2026-04-10T00:00:00.000Z');
      expect(end?.toISO()).toBe('2026-05-10T00:00:00.000Z');
      expect(periods[activePeriodIndex].occurrence.toISO()).toBe(
        '2026-04-15T23:59:59.999Z',
      );
    });

    it('keeps boundaries at the start of day in a zone where DST jumps at midnight', () => {
      // America/Santiago: 2019-09-08 starts at 01:00, there is no 00:00.
      const { periods, activePeriodIndex } = getPeriodicityPeriods(
        { type: 'monthly', occurrences: [{ date: 8 }] },
        5,
        0,
        0,
        DateTime.fromISO('2019-09-05T12:00:00.000Z'),
        'America/Santiago',
      );
      const { start } = periods[activePeriodIndex].interval;
      expect(start?.toISO()).toBe('2019-09-03T00:00:00.000-04:00');
      expect(periods[activePeriodIndex].occurrence.toISO()).toBe(
        '2019-09-08T23:59:59.999-03:00',
      );
    });

    it('throws on an invalid now with a message naming now, not the zone', () => {
      expect(() =>
        getPeriodicityPeriods(plan, 5, 0, 0, DateTime.invalid('test')),
      ).toThrow(/Invalid 'now'/);
    });

    it('throws on a zone that does not exist (caller error, not plan data)', () => {
      expect(() =>
        getPeriodicityPeriods(plan, 5, 0, 0, now, 'Nowhere/Nothing'),
      ).toThrow(/Unsupported zone/);
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

  it('a check-in on the occurrence day belongs to the period and is on time', () => {
    const period: PeriodicityPeriod = {
      interval: Interval.fromISO(
        '2026-03-31T00:00:00.000Z/2026-04-30T00:00:00.000Z',
      ),
      occurrence: DateTime.fromISO('2026-04-30T00:00:00.000Z').endOf('day'),
    };

    const onDueDay = getPeriodStatus(period, [
      { timestamp: DateTime.fromISO('2026-04-30T14:00:00.000Z') },
    ]);
    expect(onDueDay.executed).toBe('on_time');

    const dayAfter = getPeriodStatus(period, [
      { timestamp: DateTime.fromISO('2026-05-01T00:00:00.000Z') },
    ]);
    expect(dayAfter.executed).toBe('missed');
  });

  it('due-day check-in when the window is longer than the gap: previous period on time', () => {
    // Duration 45 days on a monthly plan: intervals end at the start of the
    // occurrence day, so on Jan 1 the active period is already the Feb 1 one.
    const now = DateTime.fromISO('2023-01-01T12:00:00.000Z');
    const { periods, activePeriodIndex } = getPeriodicityPeriods(
      { type: 'monthly', occurrences: [{ date: 1 }] },
      45,
      1,
      0,
      now,
      'utc',
    );
    const previous = periods[activePeriodIndex - 1];
    expect(previous.interval).toEqualInterval(
      Interval.fromISO('2022-12-01T00:00:00.000Z/2023-01-01T00:00:00.000Z'),
    );
    expect(previous.occurrence).toEqualDateTime(
      DateTime.fromISO('2023-01-01T00:00:00.000Z').endOf('day'),
    );
    expect(getPeriodStatus(previous, [{ timestamp: now }]).executed).toBe(
      'on_time',
    );
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
