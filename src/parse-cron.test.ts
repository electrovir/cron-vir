import {assert} from '@augment-vir/assert';
import {describe, it, itCases} from '@augment-vir/test';
import {createUtcFullDate, type FullDate, toTimestamp, utcTimezone} from 'date-vir';
import {
    getMillisecondsTillNextExecution,
    getNextScheduledTime,
    type NextScheduledTimeParams,
} from './parse-cron.js';

describe(getMillisecondsTillNextExecution.name, () => {
    it('will fallback to user timezone', () => {
        assert.isDefined(
            getMillisecondsTillNextExecution({
                cronExpression: '* * * * *',
            }),
        );
    });
    itCases(getMillisecondsTillNextExecution, [
        {
            it: 'handles a string minute cron expression',
            input: {
                cronExpression: '* * * * *',
                timezone: utcTimezone,
                currentTime: createUtcFullDate(1_752_158_800_439),
            },
            expect: 19_561,
        },
        {
            it: 'handles a string second cron expression',
            input: {
                cronExpression: '* * * * * *',
                timezone: utcTimezone,
                currentTime: createUtcFullDate(1_752_158_800_439),
            },
            expect: 561,
        },
        {
            it: 'handles an object cron expression',
            input: {
                cronExpression: {
                    minute: {
                        all: true,
                    },
                    hour: {
                        all: true,
                    },
                    dayOfMonth: {
                        all: true,
                    },
                    month: {
                        all: true,
                    },
                    dayOfWeek: {
                        all: true,
                    },
                },
                timezone: utcTimezone,
                currentTime: createUtcFullDate(1_752_158_800_439),
            },
            expect: 19_561,
        },
    ]);
});

describe(getNextScheduledTime.name, () => {
    /** A timestamp exactly on a minute boundary (divisible by 60,000 ms). */
    const minuteBoundary = 1_752_158_400_000;

    function nextScheduledTimestamp(params: Readonly<NextScheduledTimeParams>): number {
        return toTimestamp(getNextScheduledTime(params));
    }

    it('falls back to now when there is no previous scheduled time', () => {
        const now: FullDate = createUtcFullDate(minuteBoundary + 510_000);
        assert.strictEquals(
            nextScheduledTimestamp({
                cronExpression: '* * * * *',
                previousScheduledAt: undefined,
                now,
                timezone: utcTimezone,
            }),
            minuteBoundary + 540_000,
        );
    });

    itCases(nextScheduledTimestamp, [
        {
            it: 'advances one interval from the previous boundary when on schedule',
            input: {
                cronExpression: '* * * * *',
                previousScheduledAt: createUtcFullDate(minuteBoundary),
                /** Only 10s past the boundary, so the next minute boundary is still in the future. */
                now: createUtcFullDate(minuteBoundary + 10_000),
                timezone: utcTimezone,
            },
            expect: minuteBoundary + 60_000,
        },
        {
            it: 'skips missed boundaries and resyncs to now when jitter pushed execution behind',
            input: {
                cronExpression: '* * * * *',
                previousScheduledAt: createUtcFullDate(minuteBoundary),
                /**
                 * 8.5 minutes past the previous boundary: advancing from `previousScheduledAt`
                 * would return `+1 minute` (already in the past), so the drift guard recomputes
                 * from `now` and returns the next future minute boundary instead.
                 */
                now: createUtcFullDate(minuteBoundary + 510_000),
                timezone: utcTimezone,
            },
            expect: minuteBoundary + 540_000,
        },
    ]);
});
