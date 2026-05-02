/* node:coverage disable: this file is just types */

import {type AnyDuration, type Timezone} from 'date-vir';
import {type CronExpression} from './cron-expression.js';
import {type CronCallback} from './cron-suite.js';

/**
 * A fully defined cron job, ready to be run.
 *
 * @category Internal
 */
export type CronDefinition<Context, Name extends string> = {
    cronExpression: string | CronExpression;
    name: Name;
    callback: CronCallback<Context>;
    timezone: Timezone | undefined;
    /**
     * If set, each scheduled execution is delayed by a fresh random amount between `0` and this
     * duration. Useful for de-synchronizing fleets of workers that share the same cron expression.
     */
    jitter: AnyDuration | undefined;
};
