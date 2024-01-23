# AWS Lookups for cdk8s

## Cloudformation Outputs Lookup

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

### Usage:

You can simply use the `AwsCloudformationOutputs` class in your cdk8s project. The lookupOutput method will return the value of the output you are looking for at synthesis time.

```ts
import { Chart } from "cdk8s";
import * as kplus from "cdk8s-plus";
import { AwsCloudformationOutputs } from "cdk8s-aws-lookups";

class MyChart extends Chart {
  constructor(scope: Construct, id: string, stackName: string) {
    super(scope, id);

    const cfOutputs = new AwsCloudformationOutputs(
      awsAccID,
      stackName,
      awsRegion
    );
    const databaseConnectionString = cfOutputs.lookupOutput(
      "DatabaseConnectionString"
    );

    const deployment = new kplus.Deployment(this, "MyDeployment");
    const container = deployment.addContainer({
      image: "my-app-image",
      env: {
        DATABASE_CONNECTION_STRING: databaseConnectionString,
      },
    });
  }
}
```

```ts
import { ApiObject, App, Chart, Testing } from "cdk8s";
import { Construct } from "constructs";
import { AwsCloudformationOutputs } from "cdk8s-aws-lookups";

class MyExampleChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const awsAccID = process.env.AWS_ACC_ID || "111111111111";
    const stackName = process.env.STACK_NAME || "my-stack";
    const awsRegion = process.env.AWS_REGION || "eu-west-1";

    if (!awsAccID || !stackName) {
      throw new Error(
        "AWS_ACC_ID and STACK_NAME environment variables must be exported for the synth to to run."
      );
    }

    const cfOutputs = new AwsCloudformationOutputs(
      awsAccID,
      stackName,
      awsRegion
    );
    const databaseConnectionString = cfOutputs.lookupOutput("your-output-name");

    new ApiObject(this, "ConfigMap", {
      apiVersion: "v1",
      kind: "ConfigMap",
      data: {
        Outputs: {
          DATABASE_CONNECTION_STRING: databaseConnectionString,
        },
      },
    });
  }
}
```

## AWS SSM Parameters Lookup

The `AwsSsmParameters` is able to lookup any [`SSM Parameter`](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
defined by your deployed AWS CDK application. It does that by implementing the lookup Pattern of aws-cdk in cdk8s, using the `lookupParameter()` method.

### Usage:

```ts
class MyTestChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const awsAccID = process.env.AWS_ACC_ID; // or pass in via constructor
    const awsRegion = process.env.AWS_REGION || "eu-west-1";

    const ssmParameters = new AwsSsmParameters(awsAccID, awsRegion);
    const specificParameterValue = ssmParameters.lookupParameter("/aaa/test");

    new ApiObject(this, "ConfigMap", {
      apiVersion: "v1",
      kind: "ConfigMap",
      data: {
        Outputs: {
          SPECIFIC_PARAMETER_VALUE: specificParameterValue,
        },
      },
    });
  }
}
```
