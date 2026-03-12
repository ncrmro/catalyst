# Catalyst Platform Administration

Operational setup guide for Catalyst platform administrators.

## Public S3 Bucket for Onboarding Assets

AWS CloudFormation QuickCreate links require templates hosted on S3 — GitHub raw URLs are not supported by the `templateURL` parameter. Catalyst needs a public S3 bucket to serve onboarding templates to customers.

### Create the Bucket

```bash
# Create the bucket in us-east-1 for global access
aws s3api create-bucket \
  --bucket tetraship-public \
  --region us-east-1

# Enable versioning so existing QuickCreate links remain stable
aws s3api put-bucket-versioning \
  --bucket tetraship-public \
  --versioning-configuration Status=Enabled
```

### Configure Public Read Access

Public access is scoped to the `onboarding/` prefix only. No other objects in the bucket are publicly readable.

```bash
# Remove the default public access block
aws s3api delete-public-access-block --bucket tetraship-public

# Set bucket policy — read-only, scoped to onboarding/ prefix
aws s3api put-bucket-policy --bucket tetraship-public --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadOnboarding",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::tetraship-public/onboarding/*"
  }]
}'
```

### Upload the CloudFormation Template

```bash
aws s3 cp operator/crossplane/onboarding/aws-cloudformation.yaml \
  s3://tetraship-public/onboarding/aws-cloudformation.yaml

# Verify it's accessible
curl -I https://tetraship-public.s3.amazonaws.com/onboarding/aws-cloudformation.yaml
```

### QuickCreate URL Format

The UI generates QuickCreate links in this format:

```
https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://tetraship-public.s3.amazonaws.com/onboarding/aws-cloudformation.yaml&param_ExternalID={externalId}
```

### CI/CD

The template should be uploaded to S3 as part of the release pipeline whenever `operator/crossplane/onboarding/aws-cloudformation.yaml` changes. This ensures customers always get the latest onboarding template.

### Security Notes

- The bucket allows public **read-only** access to `onboarding/*` only
- Write access is restricted to CI/CD credentials or admin IAM users
- Versioning is enabled so older QuickCreate links continue to work
- The CloudFormation template itself creates least-privilege IAM roles in the customer's account (see spec 012 for details)
