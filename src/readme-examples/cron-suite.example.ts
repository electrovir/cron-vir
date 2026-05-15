import {defineCronSuite} from '../index.js';

type MyContext = {user: string};

const {defineCron, runCrons} = defineCronSuite<MyContext>();

const myCron = defineCron({
    name: 'my cron',
    cronExpression: {
        minute: '*',
        hour: '*',
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: '*',
    },
    callback: () => {
        // do something
    },
});

runCrons({
    context: {
        user: 'ubuntu',
    },
    crons: [myCron],
});
