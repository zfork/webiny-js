import { expect } from "chai";
import sinon from "sinon";
import _ from "lodash";
import mysql from "mysql";
import { MySQLConnection } from "..";

const sandbox = sinon.sandbox.create();

describe("mysql connection test", async function() {
    afterEach(() => sandbox.restore());

    it("should correctly differentiate between instances of pool, connection", async () => {
        const instance1 = new MySQLConnection(mysql.createPool({}));
        expect(instance1.isConnectionPool()).to.equal(true);
        expect(instance1.isConnection()).to.equal(false);

        const instance2 = new MySQLConnection(mysql.createConnection({}));
        expect(instance2.isConnectionPool()).to.equal(false);
        expect(instance2.isConnection()).to.equal(true);
    });

    it("should not accept other than Connection / Pool instances as connection argument", async () => {
        try {
            new MySQLConnection({});
        } catch (e) {
            return;
        }
        throw Error(`Error should've been thrown.`);
    });

    it("should correctly query using pool of connections", async () => {
        const instance = new MySQLConnection(mysql.createPool({}));

        const getConnectionStub = sandbox
            .stub(instance.getInstance(), "getConnection")
            .callsFake(callback =>
                callback(null, {
                    query: _.noop,
                    release: _.noop
                })
            );

        const queryWithConnectionStub = sandbox
            .stub(instance, "__executeQueryWithConnection")
            .callsFake(() => {
                return { insertId: 1 };
            });

        const results = await instance.query("INSERT INTO users ...");

        expect(getConnectionStub.callCount).to.equal(1);
        expect(results.insertId).to.equal(1);

        getConnectionStub.restore();
        queryWithConnectionStub.restore();
    });

    it("should correctly execute more than one SQL query using a single connection", async () => {
        const instance = new MySQLConnection(mysql.createConnection({}));

        const queryStub = sandbox
            .stub(instance.getInstance(), "query")
            .onCall(0)
            .callsFake((sql, callback) => {
                return callback(null, [{ id: 1 }, { id: 2 }]);
            })
            .onCall(1)
            .callsFake((sql, callback) => {
                return callback(null, [{ count: 1 }]);
            });

        const endConnectionStub = sandbox
            .stub(instance.getInstance(), "end")
            .onCall(0)
            .callsFake(callback => callback());

        const results = await instance.query([
            "SELECT * FROM users",
            "SELECT FOUND_ROWS() as count"
        ]);

        expect(queryStub.callCount).to.equal(2);

        expect(results).to.be.lengthOf(2);
        expect(results[0][0].id).to.be.equal(1);
        expect(results[0][1].id).to.be.equal(2);
        expect(results[1][0].count).to.be.equal(1);

        queryStub.restore();
        endConnectionStub.restore();
    });

    it("should return an error when using a single connection", async () => {
        const instance = new MySQLConnection(mysql.createConnection({}));

        const queryStub = sandbox
            .stub(instance.getInstance(), "query")
            .onCall(0)
            .callsFake((sql, callback) => {
                return callback("Something went wrong.", null);
            });

        const endConnectionStub = sandbox
            .stub(instance.getInstance(), "end")
            .onCall(0)
            .callsFake(callback => {
                callback();
            });

        try {
            await instance.query(["SELECT * FROM users", "SELECT FOUND_ROWS() as count"]);
        } catch (e) {
            return;
        } finally {
            queryStub.restore();
            endConnectionStub.restore();
        }

        throw Error(`Error should've been thrown.`);
    });

    it("should correctly execute more than one SQL query using pool of connections", async () => {
        const instance = new MySQLConnection(mysql.createPool({}));

        const getConnectionStub = sandbox
            .stub(instance.getInstance(), "getConnection")
            .callsFake(callback =>
                callback(null, {
                    query: _.noop,
                    release: _.noop
                })
            );

        const queryWithConnectionStub = sandbox
            .stub(instance, "__executeQueryWithConnection")
            .onCall(0)
            .callsFake(() => {
                return [{ id: 1 }, { id: 2 }];
            })
            .onCall(1)
            .callsFake(() => {
                return [{ count: 1 }];
            });

        const results = await instance.query([
            "SELECT * FROM users",
            "SELECT FOUND_ROWS() as count"
        ]);

        expect(getConnectionStub.callCount).to.equal(1);

        expect(results).to.be.lengthOf(2);
        expect(results[0][0].id).to.be.equal(1);
        expect(results[0][1].id).to.be.equal(2);
        expect(results[1][0].count).to.be.equal(1);

        getConnectionStub.restore();
        queryWithConnectionStub.restore();
    });

    it("should return an error when using a pool of connections", async () => {
        const instance = new MySQLConnection(mysql.createPool({}));

        const getConnectionStub = sandbox
            .stub(instance.getInstance(), "getConnection")
            .callsFake(callback =>
                callback(null, {
                    query: (sql, callback) => {
                        return callback("Something went wrong.", null);
                    },
                    release: callback => {}
                })
            );

        try {
            await instance.query(["SELECT * FROM users", "SELECT FOUND_ROWS() as count"]);
        } catch (e) {
            return;
        } finally {
            getConnectionStub.restore();
        }

        throw Error(`Error should've been thrown.`);
    });

    it("should throw an error on connection error", async () => {
        const instance = new MySQLConnection(mysql.createPool({}));
        const getConnectionStub = sandbox
            .stub(instance.getInstance(), "getConnection")
            .callsFake(callback => callback("Something went wrong."));

        try {
            await instance.query("INSERT INTO users ...");
        } catch (e) {
            return;
        } finally {
            expect(getConnectionStub.callCount).to.equal(1);
            getConnectionStub.restore();
        }

        throw Error(`Error should've been thrown.`);
    });

    it("should throw an error on query error", async () => {
        const instance = new MySQLConnection(mysql.createPool({}));
        let queryExecuted = false;
        const getConnectionStub = sandbox
            .stub(instance.getInstance(), "getConnection")
            .onCall(0)
            .callsFake(callback =>
                callback(null, {
                    query: (sql, callback) => {
                        queryExecuted = true;
                        callback("Something went wrong.");
                    },
                    release: _.noop
                })
            );

        try {
            await instance.query("INSERT INTO users ...");
        } catch (e) {
            return;
        } finally {
            expect(queryExecuted).to.equal(true);
            expect(getConnectionStub.callCount).to.equal(1);
            getConnectionStub.restore();
        }

        throw Error(`Error should've been thrown.`);
    });

    it("should correctly query using single connection", async () => {
        const instance = new MySQLConnection(mysql.createConnection({}));

        const endStub = sandbox
            .stub(instance.getInstance(), "end")
            .callsFake(callback => callback());
        const queryStub = sandbox
            .stub(instance.getInstance(), "query")
            .callsFake((sql, callback) => {
                callback(null, { insertId: 1 });
            });

        const results = await instance.query("INSERT INTO users ...");

        endStub.restore();
        queryStub.restore();

        expect(results.insertId).to.be.equal(1);
        expect(queryStub.callCount).to.equal(1);
        expect(endStub.callCount).to.equal(0);
    });

    it("should correctly more SQL queries using single connection", async () => {
        const instance = new MySQLConnection(mysql.createConnection({}));

        const endStub = sandbox
            .stub(instance.getInstance(), "end")
            .callsFake(callback => callback());
        const queryStub = sandbox
            .stub(instance.getInstance(), "query")
            .onCall(0)
            .callsFake((sql, callback) => {
                callback(null, [{ id: 1 }, { id: 2 }]);
            })
            .onCall(1)
            .callsFake((sql, callback) => {
                callback(null, [{ count: 1 }]);
            });

        const results = await instance.query([
            "SELECT * FROM users",
            "SELECT FOUND_ROWS() as count"
        ]);

        endStub.restore();
        queryStub.restore();

        expect(results).to.be.lengthOf(2);
        expect(results[0][0].id).to.be.equal(1);
        expect(results[0][1].id).to.be.equal(2);
        expect(results[1][0].count).to.be.equal(1);

        expect(queryStub.callCount).to.equal(2);
        expect(endStub.callCount).to.equal(0);
    });

    it("should throw an error on query error", async () => {
        const instance = new MySQLConnection(mysql.createConnection({}));

        const endStub = sandbox
            .stub(instance.getInstance(), "end")
            .callsFake(callback => callback());
        const queryStub = sandbox
            .stub(instance.getInstance(), "query")
            .callsFake((sql, callback) => {
                callback("Something went wrong.");
            });

        try {
            await instance.query("INSERT INTO users ...");
        } catch (e) {
            return;
        } finally {
            queryStub.restore();
            endStub.restore();

            expect(queryStub.callCount).to.equal(1);
            expect(endStub.callCount).to.equal(0);
        }

        throw Error(`Error should've been thrown.`);
    });
});
