/**
 * Mock pg module for Storybook browser environment
 * pg is a Node.js-only PostgreSQL client that cannot run in the browser
 */

export class Pool {
  constructor() {}
  connect() {
    return Promise.resolve({
      release: () => {},
      query: () => Promise.resolve({ rows: [] }),
    });
  }
  query() {
    return Promise.resolve({ rows: [], rowCount: 0 });
  }
  end() {
    return Promise.resolve();
  }
  on() {
    return this;
  }
}

export class Client {
  constructor() {}
  connect() {
    return Promise.resolve();
  }
  query() {
    return Promise.resolve({ rows: [], rowCount: 0 });
  }
  end() {
    return Promise.resolve();
  }
  on() {
    return this;
  }
}

export default { Pool, Client };
