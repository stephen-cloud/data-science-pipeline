import { ApplicationContext } from "../types";

const AWS = require('aws-sdk');
import { v4 as uuidv4 } from 'uuid';

export const handler = async (event: ApplicationContext): Promise<ApplicationContext> => {
    return { ...event, queryData: `query-data-${uuidv4()}` }
};
