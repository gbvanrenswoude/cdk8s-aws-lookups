import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Represents a direct lookupable object for AWS SSM Parameter values.
 */
export class AwsSsmParameters {
  private accountId: string;
  private region: string;
  private contextFilePath: string;

  constructor(accountId: string, region: string, contextFilePath?: string) {
    this.accountId = accountId;
    this.region = region;
    this.contextFilePath =
      contextFilePath || path.join(process.cwd(), "cdk8s.context.json");
  }

  public lookupParameter(parameterName: string): string {
    const compositeKey = this.createCompositeKey(parameterName);
    let resolvedValue = this.readValueFromContextFile(compositeKey);

    if (!resolvedValue) {
      resolvedValue = this.fetchParameterValue(parameterName);
      this.writeValueToContextFile(compositeKey, resolvedValue);
    }

    return resolvedValue;
  }

  private createCompositeKey(parameterName: string): string {
    return `ssm:${this.accountId}:${this.region}:${parameterName}`;
  }

  private readValueFromContextFile(key: string): string | undefined {
    if (fs.existsSync(this.contextFilePath)) {
      const context = JSON.parse(fs.readFileSync(this.contextFilePath, "utf8"));
      return context[key];
    }
    return undefined;
  }

  private fetchParameterValue(parameterName: string): string {
    const script = path.join(__dirname, "..", "dist", "fetch-ssm-value.js");
    return JSON.parse(
      execFileSync(
        process.execPath,
        [script, this.accountId, this.region, parameterName],
        { encoding: "utf-8", stdio: ["pipe"] }
      )
        .toString()
        .trim()
    );
  }

  private writeValueToContextFile(key: string, value: string): void {
    let context: { [key: string]: any } = {};
    if (fs.existsSync(this.contextFilePath)) {
      context = JSON.parse(fs.readFileSync(this.contextFilePath, "utf8"));
    }
    context[key] = value;
    fs.writeFileSync(this.contextFilePath, JSON.stringify(context, null, 2));
  }
}

/**
 * Represents a direct lookupable object for AWS CloudFormation outputs.
 */
export class AwsCloudformationOutputs {
  /**
   * The AWS account ID the target CloudFormation stack resides in.
   */
  private accountId: string;
  /**
   * The name of the CloudFormation stack.
   */
  private stackName: string;
  /**
   * The AWS region the target CloudFormation stack resides in.
   */
  private region: string;
  /**
   * Optional file path of the context file used for caching output values.
   */
  private contextFilePath: string;

  /**
   * Constructs a new instance of AwsCloudformationOutputs.
   * @param accountId The AWS account ID the target CloudFormation stack resides in.
   * @param stackName The name of the CloudFormation stack.
   * @param region The AWS region the target CloudFormation stack resides in.
   */
  constructor(
    accountId: string,
    stackName: string,
    region: string,
    contextFilePath?: string
  ) {
    this.accountId = accountId;
    this.stackName = stackName;
    this.region = region;
    this.contextFilePath =
      contextFilePath || path.join(process.cwd(), "cdk8s.context.json");
  }

  /**
   * Lookups the value of the specified CloudFormation output.
   * @param outputName The name of the CloudFormation output.
   * @returns The looked up output value.
   */

  public lookupOutput(outputName: string): string {
    const compositeKey = this.createCompositeKey(outputName);
    let resolvedValue = this.readValueFromContextFile(compositeKey);

    if (!resolvedValue) {
      resolvedValue = this.fetchOutputValue(this.stackName, outputName);
      this.writeValueToContextFile(compositeKey, resolvedValue);
    }

    return resolvedValue;
  }

  private createCompositeKey(outputName: string): string {
    return `cf:${this.accountId}:${this.region}:${this.stackName}:${outputName}`;
  }

  private readValueFromContextFile(key: string): string | undefined {
    if (fs.existsSync(this.contextFilePath)) {
      const context = JSON.parse(fs.readFileSync(this.contextFilePath, "utf8"));
      return context[key];
    }
    return undefined;
  }

  private fetchOutputValue(stackName: string, outputName: string): string {
    const script = path.join(__dirname, "..", "dist", "fetch-output-value.js");
    return JSON.parse(
      execFileSync(
        process.execPath,
        [script, this.accountId, this.region, stackName, outputName],
        { encoding: "utf-8", stdio: ["pipe"] }
      )
        .toString()
        .trim()
    );
  }

  private writeValueToContextFile(key: string, value: string): void {
    let context: { [key: string]: any } = {};
    if (fs.existsSync(this.contextFilePath)) {
      context = JSON.parse(fs.readFileSync(this.contextFilePath, "utf8"));
    }
    context[key] = value;
    fs.writeFileSync(this.contextFilePath, JSON.stringify(context, null, 2));
  }
}
