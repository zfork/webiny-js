import { HandlerArgs as RenderHandlerArgs } from "../render/types";
import { HandlerArgs as FlushHandlerArgs } from "../flush/types";
import { HandlerArgs as QueueHandlerArgs } from "../queue/add/types";

export type PrerenderingServiceClientContext = {
    prerenderingServiceClient: {
        render(args: RenderHandlerArgs): Promise<void>;
        flush(args: FlushHandlerArgs): Promise<void>;
        queue: {
            add(args: QueueHandlerArgs): Promise<void>;
            process(): Promise<void>;
        };
    };
};

export type PrerenderingServiceClientArgs = {
    handlers: {
        queue: {
            add: string;
            process: string;
        };
        render: string;
        flush: string;
    };
};
