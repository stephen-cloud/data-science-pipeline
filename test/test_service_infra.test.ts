import { App } from '@aws-cdk/core';
import { PipelineStack } from '../pipeline/pipeline-stack';

test('Lambda Handler', () => {
  // GIVEN
  const app = new App();

  // WHEN
  new PipelineStack(app, 'Stack');

  const template = app.synth().getStackByName('Stack').template['Resources'] as Map<String, any>
  const functions = Object.entries(template)
    .filter((resource) => resource[1]['Type'] === 'AWS::Lambda::Function');

  // THEN
  expect(functions.length).toEqual(5);
});
