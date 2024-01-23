import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import {
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  STSClient,
} from "@aws-sdk/client-sts";

async function assumeRole(roleArn: string) {
  const stsClient = new STSClient({});
  try {
    const response = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: "cdk8sLookupSession",
      })
    );
    return response.Credentials;
  } catch (error) {
    console.warn(`Failed to assume role: ${roleArn}. Error: ${error}`);
    return null;
  }
}

async function fetchSsmValue(
  accountId: string,
  region: string,
  parameterName: string
) {
  const roleArn = `arn:aws:iam::${accountId}:role/cdk-hnb659fds-lookup-role-${accountId}-${region}-id`;
  let credentials;
  try {
    credentials = await assumeRole(roleArn);
  } catch (error) {
    const stsClient = new STSClient({});
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    if (identity.Account !== accountId) {
      throw new Error(
        `The current AWS identity does not match the requested account ID (${accountId}) and role assumption failed.`
      );
    }
    console.warn(
      "Unable to assume default AWS CDK lookup role. Credentials are for the same account... Proceeding with the lookup."
    );
  }

  const ssmClient = new SSMClient({
    region,
    credentials: credentials
      ? {
          accessKeyId: credentials.AccessKeyId!,
          secretAccessKey: credentials.SecretAccessKey!,
          sessionToken: credentials.SessionToken!,
        }
      : undefined,
  });

  const response = await ssmClient.send(
    new GetParameterCommand({
      Name: parameterName,
    })
  );

  if (!response.Parameter) {
    throw new Error(`Unable to find parameter ${parameterName}`);
  }

  return response.Parameter.Value;
}

// Execute the fetch function with command line arguments
fetchSsmValue(process.argv[2], process.argv[3], process.argv[4])
  .then((value) => {
    console.log(JSON.stringify(value));
  })
  .catch((error) => {
    console.error("Error fetching parameter:", error);
    process.exit(1);
  });
