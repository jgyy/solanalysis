#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LightsailStack } from './lightsail-stack';

// Simple process declaration for Node.js environment
declare const process: any;

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'prod';
const domainName = app.node.tryGetContext('domain') || process.env.DOMAIN_NAME || '';
const sshKeyName = app.node.tryGetContext('sshkey') || process.env.SSH_KEY_NAME || 'solanalysis-key';

new LightsailStack(app, `SolanalysisLightsail-${environment}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-southeast-1',
  },
  environment,
  domainName,
  sshKeyName,
  tags: {
    Project: 'Solanalysis',
    Environment: environment,
    ManagedBy: 'CDK',
    DeploymentType: 'Lightsail',
    CostOptimized: 'true',
  },
});
