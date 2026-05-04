import {type Values} from '@augment-vir/common';
import {type FullDate, type UtcTimezone} from 'date-vir';
import {defineTypedCustomEvent, defineTypedEvent} from 'typed-event-target';

/**
 * Emitted when a cron job is resumed or started.
 *
 * @category Events
 */
export class CronResumeEvent extends defineTypedCustomEvent<{
    name: string;
    at: FullDate<UtcTimezone>;
}>()('cron-resume') {}

/**
 * Emitted when a cron job is paused.
 *
 * @category Events
 */
export class CronPauseEvent extends defineTypedCustomEvent<{
    name: string;
    at: FullDate<UtcTimezone>;
}>()('cron-pause') {}

/**
 * Emitted when a cron job starts executing on its current interval.
 *
 * @category Events
 */
export class CronStartEvent extends defineTypedCustomEvent<{
    name: string;
    at: FullDate<UtcTimezone>;
}>()('cron-start') {}

/**
 * Emitted when a `RunningCrons` instance gets destroyed.
 *
 * @category Events
 */
export class CronsDestroyEvent extends defineTypedEvent('crons-destroy') {}
/**
 * Emitted when a cron job finishes executing on its current interval.
 *
 * @category Events
 */
export class CronFinishEvent extends defineTypedCustomEvent<{
    name: string;
    error: undefined | Error;
    at: FullDate<UtcTimezone>;
}>()('cron-finish') {}
/**
 * Emitted when a cron job errors out in its execution.
 *
 * @category Events
 */
export class CronErrorEvent extends defineTypedCustomEvent<{
    name: string;
    error: Error;
    at: FullDate<UtcTimezone>;
}>()('cron-error') {}
/**
 * Emitted when a cron job's execution takes so long that one or more of its scheduled executions
 * are skipped. Only fires when `forceStartNextExecution` is `false` (the default).
 *
 * @category Events
 */
export class CronMissedEvent extends defineTypedCustomEvent<{
    name: string;
    /** How many scheduled iterations were skipped during the previous execution. */
    count: number;
    /** The time at which the miss was detected. */
    at: FullDate<UtcTimezone>;
}>()('cron-missed') {}
/**
 * All cron events keyed by their constructor names.
 *
 * @category Events
 */
export const cronEvents = {
    CronErrorEvent,
    CronFinishEvent,
    CronMissedEvent,
    CronPauseEvent,
    CronResumeEvent,
    CronStartEvent,
    CronsDestroyEvent,
};
/**
 * All cron events in an array.
 *
 * @category Internal
 */
export const allCronEvents = Object.values(cronEvents);

/**
 * All possible cron events.
 *
 * @category Internal
 */
export type AllCronEvents = InstanceType<Values<typeof cronEvents>>;
