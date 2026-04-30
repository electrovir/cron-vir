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
    type Timezone,
} from 'date-vir';
import {createExpressionString, type CronExpression} from './cron-expression.js';

/**
 * Options for {@link parseCronExpression}.
 *
 * @category Internal
 */
export type ParseCronOptions = {
    currentTime: FullDate;
    timezone: Timezone;
};

/**
 * Parses a cron string, like `'* * * * * *'` (with seconds) or `'* * * * *'` (without seconds).
 * Supports all formats that the [cron-parser](https://www.npmjs.com/package/cron-parser) package
 * supports.
 *
 * @category Internal
 * @returns The next date and time on which the cron should execute.
 */
export function parseCronExpression(
    cronExpression: string | CronExpression,
    options: Readonly<ParseCronOptions>,
): FullDate {
    const finalOptions: CronExpressionOptions = {
        tz: options.timezone,
        currentDate: toTimestamp(options.currentTime),
    };

    const finalExpression = check.isString(cronExpression)
        ? cronExpression
        : createExpressionString(cronExpression);

    const parsedExpression = CronExpressionParser.parse(finalExpression, finalOptions);

    const nextExecution = createFullDate(parsedExpression.next().toDate(), options.timezone);

    return nextExecution;
}

/**
 * Determines how many milliseconds are needed till the next cron execution by parsing a cron
 * string, like `'* * * * * *'` (with seconds) or `'* * * * *'` (without seconds). Supports all
 * formats that the [cron-parser](https://www.npmjs.com/package/cron-parser) package supports.
 *
 * @category Internal
 * @returns Milliseconds till the next execution.
 */
export function getMillisecondsTillNextExecution(
    cronExpression: string | CronExpression,
    options: Readonly<PartialWithUndefined<ParseCronOptions>> = {},
) {
    const timezone = options.timezone || userTimezone;
    const currentTime = options.currentTime || getNowFullDate(timezone);

    const nextDate = parseCronExpression(cronExpression, {
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
