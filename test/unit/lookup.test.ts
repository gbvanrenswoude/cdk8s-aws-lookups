import { AwsCloudformationOutputs } from "../../src/lookup";

describe("AwsCloudformationOutputs", () => {
  it("should correctly create a composite key", () => {
    const awsCloudformationOutputs = new AwsCloudformationOutputs(
      "123",
      "myStack",
      "us-east-1"
    );
    const key = awsCloudformationOutputs.createCompositeKey("testOutput");
    expect(key).toBe("123:us-east-1:myStack:testOutput");
  });
});
