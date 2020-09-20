import { Construct, StackProps, Stage } from '@aws-cdk/core';
import { CfnOutput } from '@aws-cdk/core';
import { ApplicationStack } from './application-stack';

export class ApplicationStage extends Stage {
  urlOutput: CfnOutput;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const service = new ApplicationStack(this, 'Application', {
      tags: {
        Application: 'Application',
        Environment: id
      }
    });

    this.urlOutput = service.urlOutput
  }
}
