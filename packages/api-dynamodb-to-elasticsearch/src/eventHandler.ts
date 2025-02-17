import { getNumberEnvVariable } from "~/helpers/getNumberEnvVariable";
import { createDynamoDBEventHandler, timerFactory } from "@webiny/handler-aws";
import { ElasticsearchContext } from "@webiny/api-elasticsearch/types";
import { Decompressor } from "~/Decompressor";
import { OperationsBuilder } from "~/OperationsBuilder";
import { executeWithRetry } from "~/executeWithRetry";

const MAX_PROCESSOR_PERCENT = getNumberEnvVariable(
    "MAX_ES_PROCESSOR",
    process.env.NODE_ENV === "test" ? 101 : 98
);

/**
 * Also, we need to set the maximum running time for the Lambda Function.
 * https://github.com/webiny/webiny-js/blob/f7352d418da2b5ae0b781376be46785aa7ac6ae0/packages/pulumi-aws/src/apps/core/CoreOpenSearch.ts#L232
 * https://github.com/webiny/webiny-js/blob/f7352d418da2b5ae0b781376be46785aa7ac6ae0/packages/pulumi-aws/src/apps/core/CoreElasticSearch.ts#L218
 */
const MAX_RUNNING_TIME = 900;

export const createEventHandler = () => {
    return createDynamoDBEventHandler(async ({ event, context: ctx, lambdaContext }) => {
        const timer = timerFactory(lambdaContext);
        const context = ctx as unknown as ElasticsearchContext;
        if (!context.elasticsearch) {
            console.error("Missing elasticsearch definition on context.");
            return null;
        }

        const decompressor = new Decompressor({
            plugins: context.plugins
        });

        const builder = new OperationsBuilder({
            decompressor
        });

        const operations = await builder.build({
            records: event.Records
        });
        /**
         * No need to do anything if there are no operations.
         */
        if (operations.total === 0) {
            return null;
        }
        /**
         * Execute the operations with retry.
         */
        await executeWithRetry({
            timer,
            maxRunningTime: MAX_RUNNING_TIME,
            maxProcessorPercent: MAX_PROCESSOR_PERCENT,
            context,
            operations
        });

        return null;
    });
};
