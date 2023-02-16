import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as CodeBuild from "aws-cdk-lib/aws-codebuild";

import * as CodePipeline from "aws-cdk-lib/aws-codepipeline";
import * as CodePipelineAction from "aws-cdk-lib/aws-codepipeline-actions";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";

export class S3CicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TO DO: Please replace the s3 Bucket name to a unique name of your choice.
    const websiteBucket = new s3.Bucket(this, "cicd-s3-website", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
      versioned: true,
      publicReadAccess: true,
    });

    const outputSource = new CodePipeline.Artifact();
    const outputWebsite = new CodePipeline.Artifact();

    const pipeline = new CodePipeline.Pipeline(this, "Pipeline", {
      pipelineName: "ReactStaticWebCICDPipeline",
      restartExecutionOnUpdate: true,
    });
    // TO DO: Please replace the connectionArn value with your codestar connection arn
    pipeline.addStage({
      stageName: "Source",
      actions: [
        new codepipeline_actions.GitHubSourceAction({
          actionName: "GitHub",
          branch: "master",
          output: outputSource,
          oauthToken: cdk.SecretValue.secretsManager("github-token"),
          owner: "tonyli2018",
          repo: "my-web-ui",
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Build",
      actions: [
        new CodePipelineAction.CodeBuildAction({
          actionName: "Build-UI",
          project: new CodeBuild.PipelineProject(this, "UIBuild", {
            environment: {
              buildImage: CodeBuild.LinuxBuildImage.STANDARD_5_0,
              privileged: true,
              computeType: CodeBuild.ComputeType.SMALL,
            },
            projectName: "StaticWebsiteBuild",
            buildSpec:
               CodeBuild.BuildSpec.fromSourceFilename("./buildspec.yml"),
            /*buildSpec: CodeBuild.BuildSpec.fromObject({
              version: "0.2",
              phases: {
                install: {
                  "runtime-versions": {
                    nodejs: 14,
                  },
                },
                build: {
                  commands: ["npm install", "npm run build", "ls -la"],
                },
              },
            }),*/
          }),
          input: outputSource,
          outputs: [outputWebsite],
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [
        new CodePipelineAction.S3DeployAction({
          actionName: "DeployingStaticWebsite",
          input: outputWebsite,
          bucket: websiteBucket,
        }),
      ],
    });
  }
}
