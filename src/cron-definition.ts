/* node:coverage disable: this file is just types */

import {type Timezone} from 'date-vir';
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
};
