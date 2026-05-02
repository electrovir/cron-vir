import {type MaybePromise} from '@augment-vir/common';
import {type AnyDuration, type FullDate, type Timezone} from 'date-vir';
import {type CronDefinition} from './cron-definition.js';
import {type CronExpression} from './cron-expression.js';
import {RunningCrons, type RunningCronsOptions} from './running-crons.js';

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
 * const myCron = defineCron(
 *     'my cron',
 *     {
 *         minute: '*',
 *         hour: '*',
 *         dayOfMonth: '*',
 *         month: '*',
 *         dayOfWeek: '*',
 *     },
 *     () => {
 *         // do something
 *     },
 * );
 *
 * runCrons({user: 'ubuntu'}, [myCron]);
 * ```
 */
export function defineCronSuite<Context = undefined>() {
    return {
        /** Defines an individual cron job. */
        defineCron<const Name extends string>(
            this: void,
            name: Name,
            cronExpression: string | CronExpression,
            callback: CronCallback<Context>,
            timezone?: Timezone | undefined,
            jitter?: AnyDuration | undefined,
        ) {
            return defineCron<Context, Name>(name, cronExpression, callback, timezone, jitter);
        },
        /** Runs all given crons. */
        runCrons<const Name extends string>(
            this: void,
            context: Context,
            crons: ReadonlyArray<Readonly<CronDefinition<Context, Name>>>,
            options?: Readonly<RunningCronsOptions> | undefined,
        ) {
            return new RunningCrons(context, crons, options);
        },
    };
}

function defineCron<Context, const Name extends string>(
    name: Name,
    cronExpression: string | CronExpression,
    callback: CronCallback<Context>,
    timezone?: Timezone | undefined,
    jitter?: AnyDuration | undefined,
): CronDefinition<Context, Name> {
    return {
        callback,
        name,
        cronExpression,
        timezone,
        jitter,
    };
}
