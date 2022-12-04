# Serverless Lifecycle

This [Serverless](https://github.com/serverless/serverless) plugin allows
triggering execution of npm scripts when [serverless events](https://serverless.com/framework/docs/providers/tencent/guide/plugins#hooks)
are fired.

Simply declare npm scripts with a name of the form `lifecycle:EVENT` where `EVENT` is
the name of a serverless hook event, i.e.:

- `lifecycle:before:offline:start:init`: Run script before serverless offline launches.
  This can be particularly useful to setup the local environment, such as launching
  a local kinesis and initializing it by creating some streams.
- `lifecycle:offline:start:ready`: Run post-startup script, e.g. seed s3 files.
- `lifecycle:after:offline:start`: Run cleanup scripts after serverless offline terminates.
- `lifecycle:before:package:initialize`: Run script before the packaging initialization.

# Installation

First, add the plugin to your project:

`npm install --save-dev serverless-lifecycle`

Then, inside your project's `serverless.yml` file add `serverless-lifecycle` to the top-level
plugins section. If there is no plugin section you will need to add it to the file.

```YAML
plugins:
  - serverless-lifecycle
```

# Configuration

Plugin behavior may be configured by adding keys to the `serverless-lifecycle` section in the
top-level custom section.

These are the configuration entries and their default values:

```YAML
custom:
  serverless-livecycle:
    hookPrefix: lifecycle    # The npm script prefix to indicate a serverless hook script
    setupStreams: true       # Set up redirection of stderr/stdout/stdin for npm-run-all
    runAllOptions:           # See https://github.com/mysticatea/npm-run-all/blob/HEAD/docs/node-api.md for details
      stderr:                # boolean to enable stderr, or path to file
      stdout:                # boolean to enable stdout, or path to file
      stdin:                 # boolean to enable stdin, or path to file
```

# Execution

When scripts are executed, the environment variable `SLS_CONTEXT` contains a path to
a JSON file with the contents of the `serverless` object. The available properties are:

- invocationId: Unique GUID for the current serverless invocation
- version: Serverless framework version
- cliCommands: Array with provided CLI commands (e.g. [ 'offline' ])
- cliOptions: Object with provided CLI options
- servicePath: Path to directory containing serverless.yml file
- service: Object with contents of resolved serverless.yml file
