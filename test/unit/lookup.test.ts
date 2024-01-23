import * as child_process from "child_process";
import fs from "fs";
import mockFs from "mock-fs";
import { AwsCloudformationOutputs } from "../../src/lookup";

jest.mock("child_process");

describe("AwsCloudformationOutputs", () => {
  const mockContextData = {
    "123:us-east-1:myStack:someOutput": "mockValue",
  };

  beforeEach(() => {
    mockFs({
      "/path/to": {
        "cdk8s.context.json": JSON.stringify(mockContextData),
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  it("should return the output value from context file if available", () => {
    const awsCloudformationOutputs = new AwsCloudformationOutputs(
      "123",
      "myStack",
      "us-east-1"
    );

    awsCloudformationOutputs["contextFilePath"] = "/path/to/cdk8s.context.json";

    const output = awsCloudformationOutputs.lookupOutput("someOutput");
    expect(output).toBe("mockValue");
  });

  it("should call fetchOutputValue and writeValueToContextFile if value not in context file", () => {
    const mockedExecFileSync = jest.spyOn(child_process, "execFileSync");
    mockedExecFileSync.mockReturnValue(Buffer.from(JSON.stringify("newValue")));

    mockFs({
      "/path/to": {
        "cdk8s.context.json": JSON.stringify({}),
      },
    });

    const awsCloudformationOutputs = new AwsCloudformationOutputs(
      "123",
      "myStack",
      "us-east-1"
    );
    awsCloudformationOutputs["contextFilePath"] = "/path/to/cdk8s.context.json";

    const output = awsCloudformationOutputs.lookupOutput("newOutput");
    expect(output).toBe("newValue");
    expect(mockedExecFileSync).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining("fetch-output-value.js"),
        "123",
        "us-east-1",
        "myStack",
        "newOutput",
      ],
      expect.anything()
    );

    const updatedContext = JSON.parse(
      fs.readFileSync("/path/to/cdk8s.context.json", "utf8")
    );
    expect(updatedContext["123:us-east-1:myStack:newOutput"]).toBe("newValue");
  });
});
