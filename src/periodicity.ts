import {
  ApiPeriodicity,
  ApiPeriodicityYearlyOccurrence,
} from '@allbin/mobilix-api-client';
import { DateTime, Interval, DurationLike, Zone } from 'luxon';

const sortDates = (a: DateTime, b: DateTime): number => (a > b ? 1 : -1);

/** Zone every period boundary is computed in unless the caller passes one. */
export const DEFAULT_PERIODICITY_ZONE = 'Europe/Stockholm';

/** Result for a plan without a single usable occurrence: nothing to render, no active period. */
const noPeriods = (): PeriodicityPeriods => ({
  periods: [],
  activePeriodIndex: -1,
});

export interface PeriodicityPeriod {
  /** Start and end of period. */
  interval: import('luxon').Interval;
  /** Breaking point for the period. */
  occurrence: import('luxon').DateTime;
}
export interface PeriodicityPeriods {
  /** Sorted array of periods. */
  periods: PeriodicityPeriod[];
  /** Index of the period containing "now", or -1 when the plan has no usable occurrences. */
  activePeriodIndex: number;
}

export type PeriodicityPeriodExecutionStatus = 'late' | 'missed' | 'on_time';
export type PeriodicityPeriodRemark = NonNullable<
  import('@allbin/mobilix-api-client').ApiCheckIn['result']
>;
export interface PeriodicityPeriodStatus {
  executed: PeriodicityPeriodExecutionStatus;
  remarks: PeriodicityPeriodRemark[];
}
export interface CheckIn
  extends Pick<import('@allbin/mobilix-api-client').ApiCheckIn, 'result'> {
  timestamp: DateTime;
}

const getDurationFromPeriodicityType = (
  type: ApiPeriodicity['type'],
  amount = 1,
): DurationLike => {
  switch (type) {
    case 'yearly':
      return {
        years: amount,
      };
    case 'monthly':
      return {
        months: amount,
      };
    default:
      throw new Error("Unsupported periodicity type '" + type + "'.");
  }
};

/**
 * Start of the occurrence day in the given month. A day beyond the end of the
 * month is clamped to the last day (31 means "last day of month", Feb 29 is
 * Feb 28 outside leap years). Returns an invalid DateTime when month or date
 * cannot form a date at all (month 0 or 13, date 0).
 */
/** Integer from a stored value; numbers may arrive as strings from old plans. */
const storedInteger = (value: unknown): number => {
  const n =
    typeof value === 'number' || typeof value === 'string'
      ? Number(value)
      : NaN;
  return Number.isInteger(n) ? n : NaN;
};

const occurrenceInMonth = (monthStart: DateTime, date: unknown): DateTime => {
  const day = storedInteger(date);
  if (!monthStart.isValid || Number.isNaN(day) || day < 1) {
    return DateTime.invalid('unusable occurrence');
  }
  return monthStart.set({ day: Math.min(day, monthStart.daysInMonth ?? 0) });
};

export const printPeriod = (p: PeriodicityPeriod): string => {
  const end =
    p.interval.end && p.interval.end.isValid
      ? p.interval.end.toFormat('yyyy-MM-dd')
      : 'End invalid';
  const start =
    p.interval.start && p.interval.start.isValid
      ? p.interval.start.toFormat('yyyy-MM-dd')
      : 'Start invalid';
  const occ = p.occurrence.isValid
    ? p.occurrence.toFormat('yyyy-MM-dd')
    : 'Invalid occurrence';
  return start + ' / ' + end + ' :: ' + occ;
};

export const getPeriodicityPeriods = (
  periodicity: ApiPeriodicity,
  duration: number,
  /** The number of periods to calculate before the period containing "now". 0 will return only period containing "now". */
  previousCount = 1,
  /** The number of periods to calculate after the period containing "now". 0 will return only period containing "now". */
  nextCount = 0,
  /** Defaults to DateTime.now. Converted into `zone` before use. */
  now?: DateTime,
  /** Zone the period boundaries (midnights) are computed in. Never the device zone. */
  zone: string | Zone = DEFAULT_PERIODICITY_ZONE,
): PeriodicityPeriods => {
  if (now && !now.isValid) {
    throw new Error("Invalid 'now': " + String(now.invalidReason));
  }
  now = (now || DateTime.now()).setZone(zone);
  if (!now.isValid) {
    throw new Error("Unsupported zone '" + String(zone) + "'.");
  }

  const extendedPeriods: PeriodicityPeriod[] = [];
  const periodicityType = periodicity.type;
  if (periodicityType !== 'yearly' && periodicityType !== 'monthly') {
    return noPeriods();
  }

  /** repeats; an array of values from -previousCount to +nextCount with a 0 in between. */
  const repeats = [0];
  for (let i = 1; i <= previousCount + 1; i++) {
    repeats.unshift(-i);
  }
  for (let i = 1; i <= nextCount + 3; i++) {
    repeats.push(i);
  }

  /** First day of the month each occurrence falls in for offset 0, paired with its date. */
  const anchors: { monthStart: DateTime; date: unknown }[] = [];
  const storedOccurrences: unknown = periodicity.occurrences;
  for (const occurrence of Array.isArray(storedOccurrences)
    ? (storedOccurrences as unknown[])
    : []) {
    if (typeof occurrence !== 'object' || occurrence === null) {
      continue;
    }
    const { month: storedMonth, date } =
      occurrence as Partial<ApiPeriodicityYearlyOccurrence>;
    // Stored plans predate the API validators; fromObject throws on non-numeric units.
    const month =
      periodicityType === 'yearly' ? storedInteger(storedMonth) : now.month;
    if (Number.isNaN(month)) {
      continue;
    }
    const monthStart = DateTime.fromObject(
      { year: now.year, month, day: 1 },
      { zone: now.zone },
    );
    if (occurrenceInMonth(monthStart, date).isValid) {
      anchors.push({ monthStart, date });
    }
  }

  if (anchors.length === 0) {
    return noPeriods();
  }

  for (const offset of repeats) {
    //Loop all repeats to add a range of occurrences guaranteed to contain the requested number of occurrences.
    const occurrences = anchors
      .map(({ monthStart, date }) =>
        occurrenceInMonth(
          monthStart.plus(
            getDurationFromPeriodicityType(periodicityType, offset),
          ),
          date,
        ),
      )
      .sort(sortDates)
      // Two dates clamped to the same day (30 and 31 in February) are one occurrence,
      // otherwise the second one becomes a period that is already missed.
      .filter(
        (occ, i, all) => i === 0 || occ.toMillis() !== all[i - 1].toMillis(),
      );

    for (const occ of occurrences) {
      // startOf keeps the boundary at midnight in zones where DST jumps at 00:00.
      let beginning = occ.minus({ days: duration }).startOf('day');
      const end = occ;
      const previous = extendedPeriods[extendedPeriods.length - 1];
      if (previous && previous.interval.end && previous.interval.start) {
        if (previous.interval.end > beginning) {
          //Duration is so long we are trying to begin before the previous end, clip.
          beginning = previous.interval.end;
        } else {
          //Duration is too short creating a gap, extend previous end to current beginning.
          previous.interval = Interval.fromDateTimes(
            previous.interval.start,
            beginning,
          );
        }

        //NOTE: When duration is longer than period the first calculated period will be the only
        //period whose length is the actual length, all other periods will be clipped.
      }

      extendedPeriods.push({
        interval: Interval.fromDateTimes(beginning, end),
        occurrence: occ.endOf('day'),
      });
    }
  }

  let nowBeginningIndex = -1;

  for (const p of extendedPeriods) {
    if (p.interval.start && p.interval.start > now) {
      break;
    }
    nowBeginningIndex += 1;
  }

  const periods: PeriodicityPeriod[] = [];

  for (let i = 1; i <= previousCount; i++) {
    const p = extendedPeriods[nowBeginningIndex - i];
    periods.unshift(p);
  }

  for (let i = 0; i <= nextCount; i++) {
    const p = extendedPeriods[nowBeginningIndex + i];
    periods.push(p);
  }

  return {
    periods,
    activePeriodIndex: previousCount,
  };
};

/**
 * Utility for checking the status of a PeriodicityPeriod based on provided CheckIns.
 *
 * A check-in belongs to the period when it lies inside the interval or on the
 * occurrence day itself. getPeriodicityPeriods extends each interval to the
 * opening of the next window, so it normally contains the occurrence day; only
 * when the window is longer than the gap between occurrences is the interval
 * clipped to end at the start of that day. A due-day check-in is on time either
 * way, and in the clipped case it also lies in the next period's interval.
 */
export const getPeriodStatus = (
  period: PeriodicityPeriod,
  checkIns: CheckIn[],
): PeriodicityPeriodStatus => {
  const { start } = period.interval;
  const filteredCheckIns = checkIns.filter(
    (checkIn) =>
      period.interval.contains(checkIn.timestamp) ||
      (start !== null &&
        start <= checkIn.timestamp &&
        checkIn.timestamp <= period.occurrence),
  );

  if (filteredCheckIns.length === 0) {
    return {
      remarks: [],
      executed: 'missed',
    };
  }

  const executed = filteredCheckIns.some(
    (checkIn) => checkIn.timestamp <= period.occurrence,
  )
    ? 'on_time'
    : 'late';

  const remarks = filteredCheckIns
    .filter((checkIn) => checkIn.result !== undefined)
    .map<PeriodicityPeriodRemark>(
      (checkIn) => checkIn.result as PeriodicityPeriodRemark,
    );

  return {
    executed,
    remarks,
  };
};
