import { ApiObject, App, Chart, Testing } from "cdk8s";
import { Construct } from "constructs";
import { AwsCloudformationOutputs } from "../../src/lookup";

class MyTestChart extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const awsAccID = process.env.AWS_ACC_ID;
    const stackName = process.env.STACK_NAME;
    const awsRegion = process.env.AWS_REGION || "eu-west-1";

    if (!awsAccID || !stackName) {
      throw new Error(
        "AWS_ACC_ID and STACK_NAME environment variables must be exported for the integration test to run."
      );
    }

    const cfOutputs = new AwsCloudformationOutputs(
      awsAccID,
      stackName,
      awsRegion
    );
    const databaseConnectionString = cfOutputs.lookupOutput(
      "aadApplicationsRolesStatus"
    );

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

describe("MyChart", () => {
  it("should set DATABASE_CONNECTION_STRING correctly in the ConfigMap", () => {
    const app = new App();
    const chart = new MyTestChart(app, "MyChart");

    const manifest = Testing.synth(chart);

    const configMap = manifest.find((m) => m.kind === "ConfigMap");
    expect(configMap.data.Outputs.DATABASE_CONNECTION_STRING).toEqual(
      "Success"
    );
  });
});
