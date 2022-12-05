const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp-promise');
const exitHook = require('async-exit-hook');
const runAll = require('npm-run-all');

class ServerlessLifecycle {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.pluginName = 'serverless-lifecycle';

    this.config = serverless.service.custom[this.pluginName] || {};
    this.hookPrefix = `${_.trimEnd(
      this.config.hookPrefix || 'lifecycle',
      ':',
    )}:`;

    this.hooks = this.buildHooksObject();
  }

  debug(msg) {
    if (process.env.SLS_DEBUG) {
      this.serverless.cli.log(msg, this.pluginName);
    }
  }

  buildHooksObject() {
    const nodeScripts = this.getNodeScripts();
    return _.chain(nodeScripts)
      .toPairs()
      .filter(([k]) => _.startsWith(k, this.hookPrefix))
      .map(([k, v]) => this.getHookRunner(k, !v))
      .fromPairs()
      .value();
  }

  getNodeScripts() {
    const rootPath = this.serverless.config.servicePath;
    const packageJsonPath = path.join(rootPath, 'package.json');
    try {
      return {
        'hook:initialize': null,
        // eslint-disable-next-line global-require, import/no-dynamic-require
        ...require(packageJsonPath).scripts,
      };
    } catch (error) {
      return {};
    }
  }

  getHookRunner(scriptName, isSynthetic) {
    const trimLength = this.hookPrefix.length;
    const hook = scriptName.slice(trimLength);
    const isInitializeHook = hook === 'initialize';
    const hookRunner = isInitializeHook ? this.onInitialize : this.onHook;
    return [hook, hookRunner.bind(this, scriptName, isSynthetic)];
  }

  async onInitialize(scriptName, isSynthetic) {
    await this.setupServerlessContext();
    if (isSynthetic) return undefined;
    return this.onHook();
  }

  async setupServerlessContext() {
    const context = this.createServerlessContext();
    const json = JSON.stringify(context);
    const tmpPath = await tmp.tmpName();
    process.env.SLS_CONTEXT = tmpPath;
    fs.writeFileSync(tmpPath, json);
    exitHook(() => fs.unlinkSync(tmpPath));
  }

  createServerlessContext() {
    const { serverless } = this;
    return {
      invocationId: serverless.invocationId,
      version: serverless.version,
      cliCommands: serverless.pluginManager.cliCommands,
      cliOptions: serverless.pluginManager.cliOptions,
      servicePath: serverless.config.servicePath,
      service: _.chain(serverless.service)
        .pick([
          'service',
          'custom',
          'plugins',
          'provider',
          'functions',
          'resources',
          'package',
          'frameworkVersion',
          'app',
          'tenant',
          'org',
          'layers',
          'outputs',
        ])
        .pickBy()
        .value(),
    };
  }

  async onHook(scriptName) {
    this.debug(`Running lifecycle script ${scriptName}`);
    return runAll(scriptName);
  }
}

module.exports = ServerlessLifecycle;
