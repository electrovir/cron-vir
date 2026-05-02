import {assertWrap} from '@augment-vir/assert';
import {
    callAsynchronously,
    ensureErrorAndPrependMessage,
    extractDuplicates,
    log,
    type LoggerLogs,
    type PartialWithUndefined,
    randomInteger,
} from '@augment-vir/common';
import {
    convertDuration,
    diffDates,
    type FullDate,
    getNowFullDate,
    getNowInUtcTimezone,
    type Timezone,
    toNewTimezone,
    userTimezone,
    utcTimezone,
} from 'date-vir';
import {ListenTarget} from 'typed-event-target';
import {type CronDefinition} from './cron-definition.js';
import {
    type AllCronEvents,
    CronErrorEvent,
    CronFinishEvent,
    CronPauseEvent,
    CronResumeEvent,
    CronsDestroyEvent,
    CronStartEvent,
} from './cron-events.js';
import {parseCronExpression} from './parse-cron.js';

/**
 * Options for {@link RunningCrons}.
 *
 * @category Internal
 */
export type RunningCronsOptions = PartialWithUndefined<{
    /**
     * Immediately invoke all crons, then proceed as usual.
     *
     * @default false
     */
    runAllImmediately: boolean;
    /**
     * Silence all logging. If you still want to log errors, listen to {@link CronErrorEvent} and log
     * its error.
     *
     * @default false
     */
    silent: boolean;
    /**
     * If any cron job errors at any time, the entire cron setup is destroyed; all crons are
     * stopped.
     *
     * @default false
     */
    abortOnError: boolean;
    /**
     * Start all crons paused on {@link RunningCrons} construction. In other words, don't start any
     * of the cron intervals on {@link RunningCrons} construction.
     *
     * @default false
     */
    startPaused: boolean;
    /**
     * If `true`, starts the countdown for the next cron execution even if the current execution has
     * not finished yet. Otherwise, the countdown to the next execution won't start until the
     * current execution is finished (the default behavior), which may result in missed crons but
     * prevents overlapping executions of the same cron.
     *
     * @default false
     */
    forceStartNextExecution: boolean;
    /**
     * If not set, the user's current timezone will be used. Note that individual crons can override
     * this timezone.
     */
    timezone: Timezone;
}>;

/**
 * The return class from running cron jobs. Can be used to pause all crons, receive events, start
 * specific crons, etc.
 *
 * @category Internal
 */
export class RunningCrons<Context, Name extends string> extends ListenTarget<AllCronEvents> {
    protected readonly timeouts: {
        [CronName in string]: Readonly<ReturnType<typeof globalThis.setTimeout>> | undefined;
    } = {};

    protected readonly lastExecutionTimes: Partial<{[CronName in string]: FullDate | undefined}> =
        {};
    public readonly cronStatuses: {
        [CronName in string]: {
            /** If `true`, the cron is currently executing. */
            inFlight: boolean;
            /** If `true`, the cron has been paused (so the next execution will not happen). */
            paused: boolean;
        };
    } = {};
    protected readonly log: LoggerLogs;

    constructor(
        public readonly context: Context,
        public readonly crons: ReadonlyArray<Readonly<CronDefinition<Context, Name>>>,
        public readonly options: Readonly<RunningCronsOptions> = {},
    ) {
        super();

        this.log = log.if(!options.silent);

        const {duplicates} = extractDuplicates(crons.map((cron) => cron.name));

        if (duplicates.length) {
            throw new Error(`Cannot have duplicate cron names: ${duplicates.join(',')}`);
        }

        this.crons.forEach((cron) => {
            this.cronStatuses[cron.name] = {
                inFlight: false,
                paused: !!this.options.startPaused,
            };
        });

        if (!this.options.startPaused) {
            /** Call this asynchronously so the consumer has a chance to attach event listeners. */
            // eslint-disable-next-line sonarjs/no-async-constructor
            void callAsynchronously(() => {
                this.crons.forEach((cron) => {
                    if (this.setNextCron(cron, this.options.runAllImmediately)) {
                        this.dispatch(
                            new CronResumeEvent({
                                detail: {
                                    name: cron.name,
                                    at: getNowInUtcTimezone(),
                                },
                            }),
                        );
                    }
                });
            });
        }
    }

    /**
     * Resume a specific cron job.
     *
     * @returns `false` if no cron by the given name was found or if the cron was already resumed.
     */
    public resumeCron(name: Name): boolean {
        if (!this.cronStatuses[name]?.paused) {
            return false;
        }

        const cron = this.crons.find((cron) => cron.name === name);

        /* node:coverage ignore next 3: type guard that technically cannot be false */
        if (!cron) {
            return false;
        }

        this.log.faint(`Resumed cron '${cron.name}'`);
        assertWrap.isDefined(
            this.cronStatuses[cron.name],
            `Failed to find status for cron '${cron.name}'.`,
        ).paused = false;
        this.dispatch(
            new CronResumeEvent({
                detail: {
                    name: cron.name,
                    at: getNowInUtcTimezone(),
                },
            }),
        );

        return this.setNextCron(cron);
    }

    /** Set the next iteration of the given cron. */
    protected setNextCron(
        cron: Readonly<CronDefinition<Context, string>>,
        immediate?: boolean | undefined,
    ): boolean {
        if (this.cronStatuses[cron.name]?.paused) {
            return false;
        }

        const cronTimezone =
            /* node:coverage ignore next 1: all tests use UTC timezones */
            cron.timezone ?? this.options.timezone ?? userTimezone;
        const now = getNowFullDate(cronTimezone);
        const nextScheduledTime = parseCronExpression(cron.cronExpression, {
            currentTime: now,
            timezone: cronTimezone,
        });
        const baseTimeoutMilliseconds = diffDates(
            {
                start: now,
                end: nextScheduledTime,
            },
            {
                milliseconds: true,
            },
        ).milliseconds;
        const jitterMilliseconds = cron.jitter
            ? randomInteger({
                  min: 0,
                  max: convertDuration(cron.jitter, {
                      milliseconds: true,
                  }).milliseconds,
              })
            : 0;
        const timeoutMilliseconds = baseTimeoutMilliseconds + jitterMilliseconds;
        /* node:coverage ignore next 1 */
        const scheduledAt = toNewTimezone(immediate ? now : nextScheduledTime, utcTimezone);

        globalThis.clearTimeout(this.timeouts[cron.name]);
        this.timeouts[cron.name] = globalThis.setTimeout(
            async () => {
                /* node:coverage ignore next 3: cannot consistently trigger this */
                if (this.cronStatuses[cron.name]?.paused) {
                    return;
                }
                if (this.options.forceStartNextExecution) {
                    this.setNextCron(cron);
                }
                this.log.info(`Starting cron '${cron.name}'`);
                this.dispatch(
                    new CronStartEvent({
                        detail: {
                            name: cron.name,
                            at: getNowInUtcTimezone(),
                        },
                    }),
                );
                const status = assertWrap.isDefined(
                    this.cronStatuses[cron.name],
                    `Failed to find status for cron '${cron.name}'.`,
                );
                status.inFlight = true;
                let error: Error | undefined;
                try {
                    await cron.callback({
                        context: this.context,
                        silent: !!this.options.silent,
                        lastExecutedAt: this.lastExecutionTimes[cron.name],
                        scheduledAt,
                    });
                    this.log.success(`Finished cron '${cron.name}'`);
                } catch (caught) {
                    error = ensureErrorAndPrependMessage(caught, `Cron '${cron.name}' failed:`);
                    this.log.error(error);
                    this.dispatch(
                        new CronErrorEvent({
                            detail: {
                                error,
                                name: cron.name,
                                at: getNowInUtcTimezone(),
                            },
                        }),
                    );
                } finally {
                    status.inFlight = false;
                    const now = getNowInUtcTimezone();

                    this.lastExecutionTimes[cron.name] = now;
                    this.dispatch(
                        new CronFinishEvent({
                            detail: {
                                name: cron.name,
                                error,
                                at: now,
                            },
                        }),
                    );
                    if (this.options.abortOnError && error) {
                        this.destroy();
                    }
                    if (!this.options.forceStartNextExecution) {
                        this.setNextCron(cron);
                    }
                }
            },
            /* node:coverage ignore next 1 */
            immediate ? 0 : timeoutMilliseconds,
        );

        return true;
    }

    /**
     * Pause a specific cron job. This does not affect any currently running jobs for the cron. It
     * merely prevents the next scheduled execution from running.
     *
     * @returns `false` if no cron by the given name was found or if the cron was already paused.
     */
    public pauseCron(name: Name): boolean {
        const cron = this.crons.find((cron) => cron.name === name);

        if (!cron || this.cronStatuses[cron.name]?.paused) {
            return false;
        }
        this.log.faint(`Paused cron '${cron.name}'`);
        assertWrap.isDefined(
            this.cronStatuses[cron.name],
            `Failed to find status for cron '${cron.name}'.`,
        ).paused = true;

        globalThis.clearTimeout(this.timeouts[cron.name]);
        delete this.timeouts[cron.name];
        this.dispatch(
            new CronPauseEvent({
                detail: {
                    name: cron.name,
                    at: getNowInUtcTimezone(),
                },
            }),
        );

        return true;
    }

    /** Resume all paused cron jobs. */
    public resumeAll() {
        this.crons.forEach((cron) => {
            this.resumeCron(cron.name);
        });
    }

    /**
     * Pause all cron jobs. This does not affect any currently running crons. It merely prevents the
     * next scheduled executions from running.
     */
    public pauseAll() {
        this.crons.forEach((cron) => {
            this.pauseCron(cron.name);
        });
    }

    /** Clean up resources and stop all crons. */
    public override destroy() {
        this.pauseAll();
        this.dispatch(new CronsDestroyEvent());
        super.destroy();
    }
}
