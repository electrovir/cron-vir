import {type MaybePromise} from '@augment-vir/common';
import {type AnyDuration, type FullDate} from 'date-vir';
import {type CronDefinition} from './cron-definition.js';
import {type CronExpression} from './cron-expression.js';
import {RunningCrons, type RunningCronsParams} from './running-crons.js';

/**
 * Input shape for {@link defineCronSuite}'s `defineCron` function.
 *
 * @category Internal
 */
export type DefineCronParams<Context, Name extends string> = {
    name: Name;
    cronExpression: string | CronExpression;
    callback: CronCallback<Context>;
    timezone?: string | undefined;
    /**
     * If set, each scheduled execution is delayed by a fresh random amount between `0` and this
     * duration. Useful for de-synchronizing fleets of workers that share the same cron expression.
     */
    jitter?: AnyDuration | undefined;
};

/**
 * An individual cron's callback, set by running `defineCron`.
 *
 * @category Internal
 */
export type CronCallback<Context> = (params: {
    context: Context;
    silent: boolean;
    /** This will be undefined the first time the cron is run. */
    lastExecutedAt: Readonly<FullDate> | undefined;
    /**
     * The `scheduledAt` value from the previous execution of this cron. This will be undefined the
     * first time the cron is run.
     */
    lastExecutionScheduledAt: Readonly<FullDate> | undefined;
    /**
     * The time at which this run was scheduled to start, based on the cron expression. This may
     * differ from the actual start time due to event-loop blocking, or other delays. For runs
     * triggered by `runAllImmediately`, this is the time the run was kicked off.
     */
    scheduledAt: Readonly<FullDate>;
}) => MaybePromise<void>;

/**
 * Define a cron suite with a context type. Use the output of this to define cron jobs and then,
 * eventually, run them.
 *
 * @category Main
 * @example
 *
 * ```ts
 * import {defineCronSuite} from 'cron-vir';
 *
 * type MyContext = {user: string};
 *
 * const {defineCron, runCrons} = defineCronSuite<MyContext>();
 *
 * const myCron = defineCron({
 *     name: 'my cron',
 *     cronExpression: {
 *         minute: '*',
 *         hour: '*',
 *         dayOfMonth: '*',
 *         month: '*',
 *         dayOfWeek: '*',
 *     },
 *     callback: () => {
 *         // do something
 *     },
 * });
 *
 * runCrons({
 *     context: {user: 'ubuntu'},
 *     crons: [myCron],
 * });
 * ```
 */
export function defineCronSuite<Context = undefined>() {
    return {
        /** Defines an individual cron job. */
        defineCron<const Name extends string>(
            this: void,
            params: Readonly<DefineCronParams<Context, Name>>,
        ) {
            return defineCron<Context, Name>(params);
        },
        /** Runs all given crons. */
        runCrons<const Name extends string>(
            this: void,
            params: Readonly<RunningCronsParams<Context, Name>>,
        ) {
            return new RunningCrons(params);
        },
    };
}

function defineCron<Context, const Name extends string>({
    name,
    cronExpression,
    callback,
    timezone,
    jitter,
}: Readonly<DefineCronParams<Context, Name>>): CronDefinition<Context, Name> {
    return {
        callback,
        name,
        cronExpression,
        timezone,
        jitter,
    };
}
