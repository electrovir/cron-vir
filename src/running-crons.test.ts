import {assert, waitUntil} from '@augment-vir/assert';
import {getOrSet, wait} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {type FullDate, getNowInUtcTimezone, utcTimezone} from 'date-vir';
import {type CronDefinition} from './cron-definition.js';
import {cronEvents} from './cron-events.js';
import {mockContext, mockCrons, runMockCrons} from './cron-suite.mock.js';
import {type RunningCronsOptions, RunningCrons} from './running-crons.js';

describe(RunningCrons.name, () => {
    function setupTest<const Name extends string>(
        context: any,
        crons: CronDefinition<any, Name>[],
        options?: RunningCronsOptions | undefined,
    ) {
        const events: Partial<{
            [Key in keyof typeof cronEvents]: string[];
        }> = {};

        const instance = runMockCrons(context, crons, options);
        Object.values(cronEvents).forEach((eventConstructor) => {
            instance.listen(eventConstructor, (eventInstance) => {
                const cronName = 'detail' in eventInstance ? eventInstance.detail.name : undefined;

                if (cronName) {
                    getOrSet(
                        events as Record<string, string[]>,
                        eventConstructor.name,
                        () => [],
                    ).push(cronName);
                }
            });
        });

        return {
            instance,
            events,
        };
    }

    it('runs crons', async () => {
        await waitUntil.isTruthy(() => getNowInUtcTimezone().second === 0, {
            timeout: {
                minutes: 1.5,
            },
        });

        const {events, instance} = setupTest(mockContext, mockCrons);
        try {
            instance.resumeAll();

            await waitUntil.isLengthAtLeast(3, () => events.CronStartEvent || []);
        } finally {
            instance.destroy();
        }

        /** Wait a bit to ensure the crons really stopped. */
        await wait({
            seconds: 10,
        });

        assert.deepEquals(events, {
            CronResumeEvent: [
                'mock 1',
                'mock 2',
            ],
            CronStartEvent: [
                'mock 1',
                'mock 1',
                'mock 2',
            ],
            CronFinishEvent: [
                'mock 1',
                'mock 1',
            ],
            CronPauseEvent: [
                'mock 1',
                'mock 2',
            ],
        });
    });
    it('waits for crons to finish', async () => {
        const {events, instance} = setupTest(mockContext, [
            {
                name: 'long cron',
                async callback() {
                    await wait({
                        seconds: 4,
                    });
                },
                cronExpression: {
                    second: '*',
                    minute: '*',
                    hour: '*',
                    dayOfMonth: '*',
                    month: '*',
                    dayOfWeek: '*',
                },
                timezone: utcTimezone,
                jitter: undefined,
            },
        ]);
        try {
            instance.resumeAll();

            await waitUntil.isLengthAtLeast(2, () => events.CronFinishEvent || [], {
                timeout: {
                    seconds: 30,
                },
            });
        } finally {
            instance.destroy();
        }

        /** Wait a bit to ensure the crons really stopped. */
        await wait({
            seconds: 10,
        });

        assert.deepEquals(events, {
            CronResumeEvent: [
                'long cron',
            ],
            CronStartEvent: [
                'long cron',
                'long cron',
            ],
            CronFinishEvent: [
                'long cron',
                'long cron',
            ],
            CronPauseEvent: [
                'long cron',
            ],
        });
    });
    it('can immediately fire crons', async () => {
        const {events, instance} = setupTest(
            mockContext,
            [
                {
                    name: 'long cron',
                    async callback() {
                        await wait({
                            seconds: 4,
                        });
                    },
                    cronExpression: {
                        second: '*',
                        minute: '*',
                        hour: '*',
                        dayOfMonth: '*',
                        month: '*',
                        dayOfWeek: '*',
                    },
                    timezone: utcTimezone,
                    jitter: undefined,
                },
            ],
            {
                forceStartNextExecution: true,
            },
        );
        try {
            instance.resumeAll();

            await waitUntil.isLengthAtLeast(2, () => events.CronFinishEvent || []);
            instance.pauseAll();

            await waitUntil.isLengthExactly(6, () => events.CronStartEvent || [], {
                timeout: {
                    minutes: 2,
                },
            });
            await waitUntil.isLengthExactly(
                (events.CronStartEvent || []).length,
                () => events.CronFinishEvent || [],
                {
                    timeout: {
                        minutes: 2,
                    },
                },
            );
        } finally {
            instance.destroy();
        }

        assert.deepEquals(events, {
            CronResumeEvent: [
                'long cron',
            ],
            CronStartEvent: [
                'long cron',
                'long cron',
                'long cron',
                'long cron',
                'long cron',
                'long cron',
            ],
            CronFinishEvent: [
                'long cron',
                'long cron',
                'long cron',
                'long cron',
                'long cron',
                'long cron',
            ],
            CronPauseEvent: [
                'long cron',
            ],
        });
    });

    it('fails on duplicate cron names', () => {
        assert.throws(() => {
            return new RunningCrons(undefined, [
                {
                    name: 'a',
                    callback: () => {},
                    cronExpression: {
                        minute: 0,
                        hour: 0,
                        dayOfMonth: '*',
                        month: '*',
                        dayOfWeek: '*',
                    },
                    timezone: utcTimezone,
                    jitter: undefined,
                },
                {
                    name: 'a',
                    callback: () => {},
                    cronExpression: {
                        minute: 0,
                        hour: 0,
                        dayOfMonth: '*',
                        month: '*',
                        dayOfWeek: '*',
                    },
                    timezone: utcTimezone,
                    jitter: undefined,
                },
            ]);
        });
    });
    it('can start paused', async () => {
        const {events, instance} = setupTest(mockContext, mockCrons, {
            startPaused: true,
        });

        try {
            await wait({
                seconds: 4,
            });

            assert.deepEquals(events, {}, 'no events should have been fired');
        } finally {
            instance.destroy();
        }
    });
    it('pauses a single cron', async () => {
        const {events, instance} = setupTest(mockContext, mockCrons);

        try {
            assert.isTrue(instance.pauseCron('mock 2'));
            assert.isFalse(instance.pauseCron('mock 2'));
            // @ts-expect-error: intentionally incorrect cron name
            assert.isFalse(instance.pauseCron('invalid name'));

            await waitUntil.isLengthAtLeast(2, () => events.CronStartEvent || []);
        } finally {
            instance.destroy();
        }

        assert.deepEquals(events, {
            CronPauseEvent: [
                'mock 2',
                'mock 1',
            ],
            CronResumeEvent: [
                'mock 1',
            ],
            CronStartEvent: [
                'mock 1',
                'mock 1',
            ],
            CronFinishEvent: [
                'mock 1',
                'mock 1',
            ],
        });
    });
    it('resumes a single cron', async () => {
        const {events, instance} = setupTest(mockContext, mockCrons, {
            startPaused: true,
        });

        try {
            assert.isTrue(instance.resumeCron('mock 1'));
            assert.isFalse(instance.resumeCron('mock 1'));
            // @ts-expect-error: intentionally incorrect cron name
            assert.isFalse(instance.resumeCron('invalid name'));

            await waitUntil.isLengthAtLeast(2, () => events.CronStartEvent || []);
        } finally {
            instance.destroy();
        }

        assert.deepEquals(events, {
            CronResumeEvent: [
                'mock 1',
            ],
            CronStartEvent: [
                'mock 1',
                'mock 1',
            ],
            CronFinishEvent: [
                'mock 1',
                'mock 1',
            ],
            CronPauseEvent: [
                'mock 1',
            ],
        });
    });
    it('handles a cron error', async () => {
        await waitUntil.isTruthy(() => getNowInUtcTimezone().second === 0, {
            timeout: {
                minutes: 1.5,
            },
        });

        const {events, instance} = setupTest(mockContext, [
            {
                name: 'errors',
                callback() {
                    throw new Error('fake error');
                },
                cronExpression: {
                    second: '*',
                    minute: '*',
                    hour: '*',
                    dayOfMonth: '*',
                    month: '*',
                    dayOfWeek: '*',
                },
                timezone: utcTimezone,
                jitter: undefined,
            },
        ]);

        try {
            await waitUntil.isLengthAtLeast(2, () => events.CronStartEvent || []);
        } finally {
            instance.destroy();
        }

        assert.deepEquals(events, {
            CronResumeEvent: [
                'errors',
            ],
            CronStartEvent: [
                'errors',
                'errors',
            ],
            CronErrorEvent: [
                'errors',
                'errors',
            ],
            CronFinishEvent: [
                'errors',
                'errors',
            ],
            CronPauseEvent: [
                'errors',
            ],
        });
    });
    it('passes scheduledAt to the callback', async () => {
        const captured: FullDate[] = [];
        const {instance} = setupTest(mockContext, [
            {
                name: 'scheduled-test',
                callback({scheduledAt}) {
                    captured.push(scheduledAt);
                },
                cronExpression: {
                    second: '*',
                    minute: '*',
                    hour: '*',
                    dayOfMonth: '*',
                    month: '*',
                    dayOfWeek: '*',
                },
                timezone: utcTimezone,
                jitter: undefined,
            },
        ]);

        try {
            await waitUntil.isLengthAtLeast(1, () => captured);
        } finally {
            instance.destroy();
        }

        const first = captured[0];
        assert.isDefined(first);
        assert.strictEquals(first.timezone, utcTimezone);
        assert.strictEquals(first.millisecond, 0);
    });
    it('applies per-run jitter', async () => {
        const {events, instance} = setupTest(mockContext, [
            {
                name: 'jittered',
                callback: () => {},
                cronExpression: {
                    second: '*',
                    minute: '*',
                    hour: '*',
                    dayOfMonth: '*',
                    month: '*',
                    dayOfWeek: '*',
                },
                timezone: utcTimezone,
                /**
                 * A week-long jitter makes the chance of firing within the wait window below ~7e-6,
                 * so this test is effectively deterministic without stubbing the random source.
                 */
                jitter: {
                    days: 7,
                },
            },
        ]);

        try {
            await wait({
                seconds: 4,
            });

            assert.deepEquals(events.CronStartEvent || [], []);
        } finally {
            instance.destroy();
        }
    });
    it('can kill the whole thing on a cron error', async () => {
        const {events, instance} = setupTest(
            mockContext,
            [
                {
                    name: 'errors',
                    callback() {
                        throw new Error('fake error');
                    },
                    cronExpression: {
                        second: '*/10',
                        minute: '*',
                        hour: '*',
                        dayOfMonth: '*',
                        month: '*',
                        dayOfWeek: '*',
                    },
                    timezone: utcTimezone,
                    jitter: undefined,
                },
            ],
            {
                abortOnError: true,
            },
        );

        await waitUntil.isLengthAtLeast(1, () => events.CronStartEvent || []);

        await wait({
            seconds: 4,
        });

        assert.deepEquals(events, {
            CronResumeEvent: [
                'errors',
            ],
            CronStartEvent: [
                'errors',
            ],
            CronErrorEvent: [
                'errors',
            ],
            CronFinishEvent: [
                'errors',
            ],
            CronPauseEvent: [
                'errors',
            ],
        });
    });
});
