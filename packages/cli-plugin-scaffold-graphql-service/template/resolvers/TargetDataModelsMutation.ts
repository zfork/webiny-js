import { TargetDataModelEntity } from "../types";
import mdbid from "mdbid";
import { TargetDataModels } from "../entities";
import TargetDataModelsResolver from "./TargetDataModelsResolver";

/**
 * Contains base `createTargetDataModel`, `updateTargetDataModel`, and `deleteTargetDataModel` GraphQL resolver functions.
 * Feel free to adjust the code to your needs. Also, note that at some point in time, you will
 * most probably want to implement custom data validation and security-related checks.
 * https://www.webiny.com/docs/how-to-guides/webiny-cli/scaffolding/extend-graphql-api/resolvers/mutation
 */

interface CreateTargetDataModelParams {
    data: {
        title: string;
        description?: string;
    };
}

interface UpdateTargetDataModelParams {
    id: string;
    data: {
        title: string;
        description?: string;
    };
}

interface DeleteTargetDataModelParams {
    id: string;
}

interface TargetDataModelsMutation {
    createTargetDataModel(params: CreateTargetDataModelParams): Promise<TargetDataModelEntity>;
    updateTargetDataModel(params: UpdateTargetDataModelParams): Promise<TargetDataModelEntity>;
    deleteTargetDataModel(params: DeleteTargetDataModelParams): Promise<TargetDataModelEntity>;
}

/**
 * To define our GraphQL resolvers, we are using the "class method resolvers" approach.
 * https://www.graphql-tools.com/docs/resolvers#class-method-resolvers
 */
export default class TargetDataModelsMutationResolver extends TargetDataModelsResolver
    implements TargetDataModelsMutation {
    /**
     * Creates and returns a new TargetDataModel entry.
     * @param data
     */
    async createTargetDataModel({ data }: CreateTargetDataModelParams) {
        const { security } = this.context;

        // We use `mdbid` (https://www.npmjs.com/package/mdbid) library to generate
        // a random, unique, and sequential (sortable) ID for our new entry.
        const id = mdbid();

        const identity = await security.getIdentity();
        const targetDataModel = {
            ...data,
            PK: this.getPK(),
            SK: id,
            id,
            createdOn: new Date().toISOString(),
            savedOn: new Date().toISOString(),
            createdBy: identity && {
                id: identity.id,
                type: identity.type,
                displayName: identity.displayName
            },
            webinyVersion: process.env.WEBINY_VERSION
        };

        // Will throw an error if something goes wrong.
        await TargetDataModels.put(targetDataModel);

        return targetDataModel;
    }

    /**
     * Updates and returns an existing TargetDataModel entry.
     * @param id
     * @param data
     */
    async updateTargetDataModel({ id, data }: UpdateTargetDataModelParams) {
        // If entry is not found, we throw an error.
        const { Item: targetDataModel } = await TargetDataModels.get({ PK: this.getPK(), SK: id });
        if (!targetDataModel) {
            throw new Error(`TargetDataModel "${id}" not found.`);
        }

        const updatedTargetDataModel = { ...targetDataModel, ...data };

        // Will throw an error if something goes wrong.
        await TargetDataModels.update(updatedTargetDataModel);

        return updatedTargetDataModel;
    }

    /**
     * Deletes and returns an existing TargetDataModel entry.
     * @param id
     */
    async deleteTargetDataModel({ id }: DeleteTargetDataModelParams) {
        // If entry is not found, we throw an error.
        const { Item: targetDataModel } = await TargetDataModels.get({ PK: this.getPK(), SK: id });
        if (!targetDataModel) {
            throw new Error(`TargetDataModel "${id}" not found.`);
        }

        // Will throw an error if something goes wrong.
        await TargetDataModels.delete(targetDataModel);

        return targetDataModel;
    }
}
