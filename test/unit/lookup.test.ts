import * as child_process from "child_process";
import fs from "fs";
import mockFs from "mock-fs";
import { AwsCloudformationOutputs, AwsSsmParameters } from "../../src/lookup";

jest.mock("child_process");

describe("AwsCloudformationOutputs", () => {
  const mockContextData = {
    "cf:123:us-east-1:myStack:someOutput": "mockValue",
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
    expect(updatedContext["cf:123:us-east-1:myStack:newOutput"]).toBe(
      "newValue"
    );
  });
});

describe("AwsSsmParameters", () => {
  const mockContextData = {
    "ssm:123:eu-west-1:someParameter": "mockParameterValue",
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

  it("should return the parameter value from context file if available", () => {
    const awsSsmParameters = new AwsSsmParameters("123", "eu-west-1");
    awsSsmParameters["contextFilePath"] = "/path/to/cdk8s.context.json";

    const parameterValue = awsSsmParameters.lookupParameter("someParameter");
    expect(parameterValue).toBe("mockParameterValue");
  });

  it("should call fetchParameterValue and writeValueToContextFile if value not in context file", () => {
    const mockedExecFileSync = jest.spyOn(child_process, "execFileSync");
    mockedExecFileSync.mockReturnValue(
      Buffer.from(JSON.stringify("newParameterValue"))
    );

    mockFs({
      "/path/to": {
        "cdk8s.context.json": JSON.stringify({}),
      },
    });

    const awsSsmParameters = new AwsSsmParameters("123", "eu-west-1");
    awsSsmParameters["contextFilePath"] = "/path/to/cdk8s.context.json";

    const parameterValue = awsSsmParameters.lookupParameter("newParameter");
    expect(parameterValue).toBe("newParameterValue");
    expect(mockedExecFileSync).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining("fetch-ssm-value.js"),
        "123",
        "eu-west-1",
        "newParameter",
      ],
      expect.anything()
    );

    const updatedContext = JSON.parse(
      fs.readFileSync("/path/to/cdk8s.context.json", "utf8")
    );
    expect(updatedContext["ssm:123:eu-west-1:newParameter"]).toBe(
      "newParameterValue"
    );
  });
});
