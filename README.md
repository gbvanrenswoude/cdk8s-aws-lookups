# AWS CloudFormation Stack Output Lookup for cdk8s

The `AwsCloudformationOutputs` is able to lookup any [`StackOutput`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html) 
defined by your deployed AWS CDK application. It does that by implementing the lookup Pattern of aws-cdk in cdk8s, using the `lookupOutput()` method.

Cloudformation client DescribeStacks returns outputs in the following format:
```ts
'Outputs': [
  {
      'OutputKey': 'string',
      'OutputValue': 'string',
      'Description': 'string',
      'ExportName': 'string'
  },
],
```

The output information will be cached in cdk8s.context.json in the root of the project and the same output value will be used on future runs. To refresh the lookup, you will have to evict the value from the cache.


In this example, we create an S3 `Bucket` with the AWS CDK, and pass its (deploy time generated) 
name as an environment variable to a Kubernetes `CronJob` resource.


## Usage:
```ts
import { Chart } from 'cdk8s';
import * as kplus from 'cdk8s-plus';
import { AwsCloudformationOutputs } from 'somewhere';

class MyChart extends Chart {
  constructor(scope: Construct, id: string, stackName: string) {
    super(scope, id);

    const cfOutputs = new AwsCloudformationOutputs(awsAccID, stackName, awsRegion);
    const databaseConnectionString = cfOutputs.lookupOutput('DatabaseConnectionString');

    const deployment = new kplus.Deployment(this, 'MyDeployment');
    const container = deployment.addContainer({
      image: 'my-app-image',
      env: {
        DATABASE_CONNECTION_STRING: databaseConnectionString
      },
    });
  }
}
```

## TODO's

// TODO: improve the contextfile so it goes into the root of the cdk8s cli project, and isolates between values
// TODO: write tests
// TODO: toss / rebuild the projen setup