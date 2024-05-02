import {
  ApiPeriodicity,
  ApiPeriodicityYearlyOccurrence,
} from '@allbin/mobilix-api-client';
import { DateTime, Interval, DurationLike } from 'luxon';

const sortDates = (a: DateTime, b: DateTime): number => (a > b ? 1 : -1);

export interface PeriodicityPeriod {
  /** Start and end of period. */
  interval: import('luxon').Interval;
  /** Breaking point for the period. */
  occurrence: import('luxon').DateTime;
}
export interface PeriodicityPeriods {
  /** Sorted array of periods. */
  periods: PeriodicityPeriod[];
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
  /** Defaults to DateTime.now. */
  now?: DateTime,
): PeriodicityPeriods => {
  now = now || DateTime.now();

  const plannedOccurrences: DateTime[] = [];
  const extendedPeriods: PeriodicityPeriod[] = [];
  const periodicityType = periodicity.type;

  /** repeats; an array of values from -previousCount to +nextCount with a 0 in between. */
  const repeats = [0];
  for (let i = 1; i <= previousCount + 1; i++) {
    repeats.unshift(-i);
  }
  for (let i = 1; i <= nextCount + 3; i++) {
    repeats.push(i);
  }

  for (const occurrence of periodicity.occurrences) {
    const year = now.year;
    const month =
      periodicityType === 'yearly'
        ? (occurrence as ApiPeriodicityYearlyOccurrence).month
        : now.month;
    plannedOccurrences.push(
      DateTime.fromObject(
        {
          year,
          month: month,
          day: occurrence.date,
        },
        { zone: now.zone },
      ).startOf('day'),
    );
  }

  if (plannedOccurrences.length === 0) {
    throw new Error('Invalid/missing occurrences specified in plan.');
  }

  plannedOccurrences.sort(sortDates);

  for (const offset of repeats) {
    for (const occurrence of plannedOccurrences) {
      //Loop all repeats to add a range of occurrences guaranteed to contain the requested number of occurrences.
      const occ = occurrence.plus(
        getDurationFromPeriodicityType(periodicityType, offset),
      );
      let beginning = occ.minus({ days: duration });
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

      const p = {
        interval: Interval.fromDateTimes(beginning, end),
        occurrence: occ.endOf('day'),
      };

      if (!p.interval.isValid) {
        console.log('occ', occ.toISO());
        throw new Error(
          `Invalid interval created: '${
            beginning.toISO() ?? 'invalid start'
          }' to '${end.toISO() ?? 'invalid end'}'`,
        );
      }
      // console.log(printPeriod(p));
      extendedPeriods.push(p);
    }
  }

  let nowBeginningIndex = -1;

  for (const p of extendedPeriods) {
    // console.log('beg', beginning.toISO());
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
 */
export const getPeriodStatus = (
  period: PeriodicityPeriod,
  checkIns: CheckIn[],
): PeriodicityPeriodStatus => {
  const filteredCheckIns = checkIns.filter((checkIn) =>
    period.interval.contains(checkIn.timestamp),
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
