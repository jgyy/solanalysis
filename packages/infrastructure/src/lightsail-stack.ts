import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface LightsailStackProps extends cdk.StackProps {
  environment: string;
  domainName?: string;
  sshKeyName?: string;
}

/**
 * Ultra-low cost Lightsail deployment in Singapore region
 * Cost: ~$3.50/month for nano instance
 */
export class LightsailStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LightsailStackProps) {
    super(scope, id, props);

    const { environment, domainName, sshKeyName } = props;

    // User data script for setting up Docker and running the application
    const userData = `#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Create application directory
mkdir -p /opt/solanalysis
cd /opt/solanalysis

# Create docker-compose.yml for production
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  backend:
    image: solanalysis/backend:latest
    container_name: solanalysis-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    image: solanalysis/frontend:latest
    container_name: solanalysis-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

${domainName ? `  # Nginx proxy for SSL termination
  nginx-proxy:
    image: nginxproxy/nginx-proxy:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - certs:/etc/nginx/certs
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
    environment:
      - ENABLE_IPV6=true
      - DEFAULT_HOST=${domainName}

  # Let's Encrypt companion for free SSL
  letsencrypt:
    image: nginxproxy/acme-companion:latest
    container_name: letsencrypt
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - certs:/etc/nginx/certs
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - acme:/etc/acme.sh
    environment:
      - NGINX_PROXY_CONTAINER=nginx-proxy
      - VIRTUAL_HOST=${domainName}
      - LETSENCRYPT_HOST=${domainName}
      - LETSENCRYPT_EMAIL=admin@${domainName}

volumes:
  certs:
  vhost:
  html:
  acme:` : ''}
EOF

# Start the application
docker-compose up -d

# Setup log rotation
cat > /etc/logrotate.d/docker << 'EOF'
/var/lib/docker/containers/*/*.log {
  rotate 3
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}
EOF

# Setup automatic updates (security patches)
echo 'unattended-upgrades unattended-upgrades/enable_auto_updates boolean true' | debconf-set-selections
apt-get install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Setup monitoring script
cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash
# Simple health check script
curl -f http://localhost/health || {
    echo "Health check failed, restarting containers..."
    cd /opt/solanalysis
    docker-compose restart
}
EOF
chmod +x /usr/local/bin/health-check.sh

# Add health check to crontab (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/health-check.sh") | crontab -

echo "Solanalysis deployment completed in Singapore region!"
`;

    // IAM role for Lambda to manage Lightsail
    const lightsailRole = new iam.Role(this, 'LightsailRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        LightsailPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lightsail:*'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Lambda function to manage Lightsail instance
    const lightsailHandler = new lambda.Function(this, 'LightsailHandler', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      role: lightsailRole,
      timeout: cdk.Duration.minutes(10),
      code: lambda.Code.fromInline(`
import boto3
import json
import time
import base64

def handler(event, context):
    print(f"Event: {json.dumps(event)}")
    
    lightsail = boto3.client('lightsail', region_name='ap-southeast-1')  # Singapore region
    
    instance_name = event['ResourceProperties']['InstanceName']
    blueprint_id = event['ResourceProperties']['BlueprintId']
    bundle_id = event['ResourceProperties']['BundleId']
    user_data = event['ResourceProperties']['UserData']
    
    try:
        if event['RequestType'] == 'Create':
            print(f"Creating Lightsail instance: {instance_name}")
            
            # Create Lightsail instance in Singapore
            response = lightsail.create_instances(
                instanceNames=[instance_name],
                availabilityZone='ap-southeast-1a',  # Singapore AZ
                blueprintId=blueprint_id,
                bundleId=bundle_id,
                userData=user_data
            )
            print(f"Create response: {response}")
            
            # Wait for instance to be running (with timeout)
            max_attempts = 60  # 10 minutes
            attempt = 0
            
            while attempt < max_attempts:
                try:
                    instance_response = lightsail.get_instance(instanceName=instance_name)
                    state = instance_response['instance']['state']['name']
                    print(f"Instance state: {state} (attempt {attempt + 1})")
                    
                    if state == 'running':
                        break
                    elif state in ['terminated', 'stopping', 'stopped']:
                        raise Exception(f"Instance failed to start, state: {state}")
                        
                    time.sleep(10)
                    attempt += 1
                except Exception as e:
                    if 'NotFoundException' in str(e):
                        print("Instance not found yet, waiting...")
                        time.sleep(10)
                        attempt += 1
                        continue
                    else:
                        raise e
            
            if attempt >= max_attempts:
                raise Exception("Timeout waiting for instance to become running")
            
            # Get final instance info
            instance = lightsail.get_instance(instanceName=instance_name)
            public_ip = instance['instance'].get('publicIpAddress', 'pending')
            private_ip = instance['instance'].get('privateIpAddress', 'pending')
            
            print(f"Instance created successfully. Public IP: {public_ip}")
            
            return {
                'PhysicalResourceId': instance_name,
                'Data': {
                    'InstanceName': instance_name,
                    'PublicIpAddress': public_ip,
                    'PrivateIpAddress': private_ip
                }
            }
            
        elif event['RequestType'] == 'Delete':
            print(f"Deleting Lightsail instance: {instance_name}")
            try:
                lightsail.delete_instance(instanceName=instance_name)
                print("Instance deletion initiated")
            except Exception as e:
                print(f"Error deleting instance: {str(e)}")
                # Don't fail deletion if instance doesn't exist
                
            return {'PhysicalResourceId': instance_name}
            
        elif event['RequestType'] == 'Update':
            print("Update requested - returning existing instance")
            # For updates, we'll return the existing instance info
            try:
                instance = lightsail.get_instance(instanceName=instance_name)
                public_ip = instance['instance'].get('publicIpAddress', 'pending')
                private_ip = instance['instance'].get('privateIpAddress', 'pending')
                
                return {
                    'PhysicalResourceId': instance_name,
                    'Data': {
                        'InstanceName': instance_name,
                        'PublicIpAddress': public_ip,
                        'PrivateIpAddress': private_ip
                    }
                }
            except Exception as e:
                print(f"Instance not found during update: {str(e)}")
                return {'PhysicalResourceId': instance_name}
            
    except Exception as e:
        print(f"Error: {str(e)}")
        raise e
`),
    });

    // Custom resource provider
    const customResourceProvider = new cdk.custom_resources.Provider(this, 'LightsailProvider', {
      onEventHandler: lightsailHandler,
    });

    // Create the Lightsail instance
    const lightsailInstance = new cdk.CustomResource(this, 'LightsailInstance', {
      serviceToken: customResourceProvider.serviceToken,
      properties: {
        InstanceName: `solanalysis-${environment}`,
        BlueprintId: 'ubuntu_22_04',
        BundleId: 'nano_2_0', // $3.50/month
        UserData: userData,
      },
    });

    new cdk.CfnOutput(this, 'InstanceName', {
      value: lightsailInstance.getAttString('InstanceName'),
      description: 'Lightsail Instance Name',
    });

    new cdk.CfnOutput(this, 'PublicIP', {
      value: lightsailInstance.getAttString('PublicIpAddress'),
      description: 'Instance Public IP Address (Singapore)',
    });

    new cdk.CfnOutput(this, 'ApplicationURL', {
      value: `http://${lightsailInstance.getAttString('PublicIpAddress')}`,
      description: 'Application URL',
    });

    if (domainName) {
      new cdk.CfnOutput(this, 'DomainSetup', {
        value: `Point ${domainName} A record to ${lightsailInstance.getAttString('PublicIpAddress')}`,
        description: 'DNS Configuration Required',
      });
      
      new cdk.CfnOutput(this, 'SSLSetup', {
        value: `SSL will be automatically configured via Let's Encrypt for ${domainName}`,
        description: 'SSL Configuration',
      });
    }

    new cdk.CfnOutput(this, 'Region', {
      value: 'ap-southeast-1 (Singapore)',
      description: 'AWS Region',
    });

    new cdk.CfnOutput(this, 'MonthlyCost', {
      value: '$3.50/month (Lightsail nano instance)',
      description: 'Estimated Monthly Cost',
    });

    new cdk.CfnOutput(this, 'SSHCommand', {
      value: `ssh -i ~/.ssh/${sshKeyName || 'your-key'}.pem ubuntu@${lightsailInstance.getAttString('PublicIpAddress')}`,
      description: 'SSH Command (after uploading your key to Lightsail console)',
    });

    new cdk.CfnOutput(this, 'NextSteps', {
      value: '1. Build and push Docker images 2. Wait 5-10 mins for deployment 3. Configure DNS if using custom domain',
      description: 'Next Steps After Deployment',
    });
  }
}
