import path = require('path');
import { CfnOutput, Construct, Duration, Stack, StackProps } from '@aws-cdk/core';
import { AssetCode, Runtime, Function, Alias } from '@aws-cdk/aws-lambda'
import { LambdaRestApi } from '@aws-cdk/aws-apigateway'
import { LambdaDeploymentGroup, LambdaDeploymentConfig } from '@aws-cdk/aws-codedeploy'
import { Metric, Alarm } from '@aws-cdk/aws-cloudwatch';
import { Cors } from '@aws-cdk/aws-apigateway';
import { Chain, Choice, Condition, Fail, StateMachine } from '@aws-cdk/aws-stepfunctions';
import { LambdaInvoke } from '@aws-cdk/aws-stepfunctions-tasks';

export class ApplicationStack extends Stack {
  urlOutput: CfnOutput;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const handler = new Function(this, 'Handler', {
      code: new AssetCode(path.resolve(__dirname, 'lambda')),
      handler: 'handler.handler',
      runtime: Runtime.NODEJS_10_X,
    });

    const alias = new Alias(this, 'x', {
      aliasName: 'Current',
      version: handler.currentVersion
    });

    const api = new LambdaRestApi(this, 'Gateway', {
      description: 'Endpoint for a simple Lambda-powered web service',
      handler: alias,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS
      }
    });

    const apiGateway5xx = new Metric({
      metricName: '5XXError',
      namespace: 'AWS/ApiGateway',
      dimensions: {
        ApiName: 'Gateway'
      },
      statistic: 'Sum',
      period: Duration.minutes(1)
    });
    const failureAlarm = new Alarm(this, 'RollbackAlarm', {
      metric: apiGateway5xx,
      threshold: 1,
      evaluationPeriods: 1,
    });

    new LambdaDeploymentGroup(this, 'DeploymentGroup ', {
      alias,
      deploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_10MINUTES,
      alarms: [
        failureAlarm
      ]
    });

    this.urlOutput = new CfnOutput(this, 'url', { value: api.url });

    // Start run
    //
    const startRunFunction = new Function(this, 'StartRun', {
      code: new AssetCode(path.resolve(__dirname, 'lambda')),
      handler: 'startRun.handler',
      runtime: Runtime.NODEJS_10_X,
    });

    const startRunTask = new LambdaInvoke(this, 'StartRunTask', {
      lambdaFunction: startRunFunction
    });

    // Query data
    //
    const queryDataFunction = new Function(this, 'QueryData', {
      code: new AssetCode(path.resolve(__dirname, 'lambda')),
      handler: 'queryData.handler',
      runtime: Runtime.NODEJS_10_X,
    });

    const queryDataTask = new LambdaInvoke(this, 'QueryDataTask', {
      lambdaFunction: queryDataFunction
    });

    // Create model
    //
    const createModelFunction = new Function(this, 'CreateModel', {
      code: new AssetCode(path.resolve(__dirname, 'lambda')),
      handler: 'createModel.handler',
      runtime: Runtime.NODEJS_10_X,
    });

    const createModelTask = new LambdaInvoke(this, 'CreateModelTask', {
      lambdaFunction: createModelFunction
    });

    // Deploy model
    //
    const deployModelFunction = new Function(this, 'deployModel', {
      code: new AssetCode(path.resolve(__dirname, 'lambda')),
      handler: 'saveModel.handler',
      runtime: Runtime.NODEJS_10_X,
    });

    const deployModelTask = new LambdaInvoke(this, 'DeployModelTask', {
      lambdaFunction: deployModelFunction
    });

    // Workflow
    //
    const definition = Chain
      .start(startRunTask)
      .next(queryDataTask)
      .next(createModelTask)
      .next(deployModelTask)

    const workflow = new StateMachine(this, 'ApplicationWorkflow', {
      definition
    });
  }
}
