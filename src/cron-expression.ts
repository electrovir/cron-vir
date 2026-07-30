import {assert, check} from '@augment-vir/assert';
import {mapObjectValues, stringify, type RequireExactlyOne, type Values} from '@augment-vir/common';
import {
    type DayOfMonth,
    type DayOfWeekIndex,
    type Hour,
    type Minute,
    type MonthNumber,
    type Second,
} from 'date-vir';

/**
 * An entire cron expression represented with a type-safe object.
 *
 * @category Internal
 */
export type CronExpression = {
    second?: CronExpressionSecond | undefined;
    minute: CronExpressionMinute;
    hour: CronExpressionHour;
    dayOfMonth: CronExpressionDayOfMonth;
    month: CronExpressionMonth;
    dayOfWeek: CronExpressionDayOfWeek;
};

/**
 * Shared options for an expression part.
 *
 * @category Internal
 */
export type SharedCronExpressionOptions<NumericOption extends number> = RequireExactlyOne<
    {
        /** Equivalent to `'*'`. */
        all: true;
        /** Sets multiple values, like `'1,2,3'`. */
        list: NumericOption[];
        /** Sets a range, like `'1-3'`. */
        range: {min: NumericOption; max: NumericOption};
        /** Every `step` instance, like `'1/5'` */
        step: {
            /**
             * If provided, `start` is the numerator of the step. If omitted, this is just `'*'`.
             *
             * For example, setting `{start: 1, step: 5}` will give you a cron string of `'1/5'`
             */
            start?: NumericOption;
            /** The denominator. */
            step: NumericOption;
        };
    } & CronExpressionRandom<NumericOption>
>;

/**
 * Random options for an expression part.
 *
 * @category Internal
 */
export type CronExpressionRandom<NumericOption extends number> = {
    /**
     * Uses a random value. This generates a cron expression string of `'H'` (or `'H(min-max)'` if
     * specified).
     */
    random: true | {min: NumericOption; max: NumericOption};
};

/**
 * Shared options for day expression parts.
 *
 * @category Internal
 */
export type SharedDay = {
    /** Last day of the week or month. Maps to `'L'`. */
    lastDay: true;
};

/**
 * {@link CronExpression} part for the second.
 *
 * @category Internal
 */
export type CronExpressionSecond = string | Second | SharedCronExpressionOptions<Second>;
/**
 * {@link CronExpression} part for the minute.
 *
 * @category Internal
 */
export type CronExpressionMinute = string | Minute | SharedCronExpressionOptions<Minute>;
/**
 * {@link CronExpression} part for the hour.
 *
 * @category Internal
 */
export type CronExpressionHour = string | Hour | SharedCronExpressionOptions<Hour>;
/**
 * {@link CronExpression} part for day of the month.
 *
 * @category Internal
 */
export type CronExpressionDayOfMonth =
    | string
    | DayOfMonth
    | SharedCronExpressionOptions<DayOfMonth>
    | SharedDay;
/**
 * {@link CronExpression} part for the month.
 *
 * @category Internal
 */
export type CronExpressionMonth = string | MonthNumber | SharedCronExpressionOptions<MonthNumber>;
/**
 * {@link CronExpression} part for day of the week.
 *
 * @category Internal
 */
export type CronExpressionDayOfWeek =
    | string
    | DayOfWeekIndex
    | SharedCronExpressionOptions<DayOfWeekIndex>
    | SharedDay
    | {
          each: {
              /** The day of the week. */
              dayOfWeek: DayOfWeekIndex | CronExpressionRandom<DayOfWeekIndex>;
              /** The nth day of that week in the month. */
              ofTheMonth: 1 | 2 | 3 | 4 | 5 | CronExpressionRandom<1 | 2 | 3 | 4 | 5>;
          };
      };

/**
 * Convert {@link CronExpression} into a string.
 *
 * @category Internal
 */
export function createExpressionString(expression: Readonly<CronExpression>): string {
    const values = mapObjectValues(expression, (key, value) => {
        return createExpressionPartString(value);
    });

    return [
        values.second,
        values.minute,
        values.hour,
        values.dayOfMonth,
        values.month,
        values.dayOfWeek,
    ]
        .filter(check.isTruthy)
        .join(' ');
}

/**
 * Convert as single part of {@link CronExpression} into a string.
 *
 * @category Internal
 */
export function createExpressionPartString(value: Values<CronExpression>): string {
    if (value == undefined) {
        return '';
    } else if (check.isNumber(value)) {
        return String(value);
    } else if (check.isString(value)) {
        return value;
    } else if ('all' in value) {
        return '*';
    } else if ('list' in value) {
        if (value.list.length) {
            return value.list.join(',');
        } else {
            return '*';
        }
    } else if ('range' in value) {
        return `${value.range.min}-${value.range.max}`;
    } else if ('step' in value) {
        return `${value.step.start ?? '*'}/${value.step.step}`;
    } else if ('random' in value) {
        return handleRandom(value);
    } else if ('lastDay' in value) {
        return 'L';
    } else if ('each' in value) {
        return `${handleRandom(value.each.dayOfWeek)}#${handleRandom(value.each.ofTheMonth)}`;
    }
    assert.tsType(value).equals<never>();
    assert.never(`Unexpected cron expression: '${stringify(value)}'`);
}

function handleRandom<const T extends Values<CronExpression>>(
    value: T,
): string | Exclude<T, CronExpressionRandom<any>> {
    if (check.isObject(value) && 'random' in value) {
        const randomParent = value as CronExpressionRandom<number>;
        if (check.isObject(randomParent.random)) {
            return `H(${randomParent.random.min}-${randomParent.random.max})`;
        } else {
            return 'H';
        }
    } else {
        return value as Exclude<T, CronExpressionRandom<any>>;
    }
}
