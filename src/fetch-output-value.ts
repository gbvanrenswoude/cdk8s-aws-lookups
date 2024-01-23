import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import {
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  STSClient,
} from "@aws-sdk/client-sts";

// lookups are cached in cdk8s.context.json
// they are done using the same lookup role as the aws-cdk uses, arn:aws:iam::accountid:role/cdk-hnb659fds-lookup-role-accountid-region-id.
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

async function fetchOutputValue(
  accountId: string,
  region: string,
  stackName: string,
  outputName: string
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
      "Unable to assume default awscdk lookup role. Credentials are for the same account... Proceeding with the lookup."
    );
  }

  const cloudformation = new CloudFormationClient({
    region,
    credentials: credentials
      ? {
          accessKeyId: credentials.AccessKeyId!,
          secretAccessKey: credentials.SecretAccessKey!,
          sessionToken: credentials.SessionToken!,
        }
      : undefined,
  });

  const response = await cloudformation.send(
    new DescribeStacksCommand({
      StackName: stackName,
    })
  );

  if (!response.Stacks) {
    throw new Error(`Unable to find stack ${stackName}`);
  }

  const outputs = response.Stacks[0].Outputs ?? [];
  const output = outputs.find((o) => o.OutputKey === outputName);

  if (!output) {
    throw new Error(
      `Unable to find output ${outputName} in stack ${stackName}`
    );
  }

  return output.OutputValue;
}

fetchOutputValue(
  process.argv[2],
  process.argv[3],
  process.argv[4],
  process.argv[5]
)
  .then((d) => {
    console.log(JSON.stringify(d));
  })
  .catch((e) => {
    throw e;
  });
