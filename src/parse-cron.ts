import {check} from '@augment-vir/assert';
import {type PartialWithUndefined} from '@augment-vir/common';
import {CronExpressionParser, type CronExpressionOptions} from 'cron-parser';
import {
    createFullDate,
    diffDates,
    getNowFullDate,
    toTimestamp,
    userTimezone,
    type FullDate,
} from 'date-vir';
import {createExpressionString, type CronExpression} from './cron-expression.js';

/**
 * Params for {@link parseCronExpression}.
 *
 * @category Internal
 */
export type ParseCronParams = {
    cronExpression: string | CronExpression;
    currentTime: FullDate;
    timezone: string;
};

/**
 * Parses a cron string, like `'* * * * * *'` (with seconds) or `'* * * * *'` (without seconds).
 * Supports all formats that the [cron-parser](https://www.npmjs.com/package/cron-parser) package
 * supports.
 *
 * @category Internal
 * @returns The next date and time on which the cron should execute.
 */
export function parseCronExpression({
    cronExpression,
    currentTime,
    timezone,
}: Readonly<ParseCronParams>): FullDate {
    const finalOptions: CronExpressionOptions = {
        tz: timezone,
        currentDate: toTimestamp(currentTime),
    };

    const finalExpression = check.isString(cronExpression)
        ? cronExpression
        : createExpressionString(cronExpression);

    const parsedExpression = CronExpressionParser.parse(finalExpression, finalOptions);

    const nextExecution = createFullDate(parsedExpression.next().toDate(), timezone);

    return nextExecution;
}

/**
 * Params for {@link getNextScheduledTime}.
 *
 * @category Internal
 */
export type NextScheduledTimeParams = {
    cronExpression: string | CronExpression;
    /** The clean cron boundary the previous execution was scheduled for, if any. */
    previousScheduledAt: FullDate | undefined;
    /** The current wall-clock time. */
    now: FullDate;
    timezone: string;
};

/**
 * Computes the next scheduled execution time for a cron, guarding against schedule drift.
 *
 * @category Internal
 */
export function getNextScheduledTime({
    cronExpression,
    previousScheduledAt,
    now,
    timezone,
}: Readonly<NextScheduledTimeParams>): FullDate {
    const nextFromPrevious = parseCronExpression({
        cronExpression,
        currentTime: previousScheduledAt ?? now,
        timezone,
    });

    if (
        previousScheduledAt &&
        diffDates(
            {
                start: now,
                end: nextFromPrevious,
            },
            {
                milliseconds: true,
            },
        ).milliseconds <= 0
    ) {
        return parseCronExpression({
            cronExpression,
            currentTime: now,
            timezone,
        });
    }

    return nextFromPrevious;
}

/**
 * Params for {@link getMillisecondsTillNextExecution}.
 *
 * @category Internal
 */
export type MillisecondsTillNextExecutionParams = PartialWithUndefined<
    Omit<ParseCronParams, 'cronExpression'>
> & {
    cronExpression: string | CronExpression;
};

/**
 * Determines how many milliseconds are needed till the next cron execution by parsing a cron
 * string, like `'* * * * * *'` (with seconds) or `'* * * * *'` (without seconds). Supports all
 * formats that the [cron-parser](https://www.npmjs.com/package/cron-parser) package supports.
 *
 * @category Internal
 * @returns Milliseconds till the next execution.
 */
export function getMillisecondsTillNextExecution(
    params: Readonly<MillisecondsTillNextExecutionParams>,
) {
    const timezone = params.timezone || userTimezone;
    const currentTime = params.currentTime || getNowFullDate(timezone);

    const nextDate = parseCronExpression({
        cronExpression: params.cronExpression,
        currentTime,
        timezone,
    });
    const diff = diffDates(
        {
            start: currentTime,
            end: nextDate,
        },
        {
            milliseconds: true,
        },
    );

    return diff.milliseconds;
}
