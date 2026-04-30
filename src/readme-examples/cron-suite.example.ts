import {defineCronSuite} from '../index.js';

type MyContext = {user: string};

const {defineCron, runCrons} = defineCronSuite<MyContext>();

const myCron = defineCron(
    'my cron',
    {
        minute: '*',
        hour: '*',
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: '*',
    },
    () => {
        // do something
    },
);

runCrons(
    {
        user: 'ubuntu',
    },
    [myCron],
);
