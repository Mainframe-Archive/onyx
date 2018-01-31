# Mainframe node

A Mainframe node consists of a blockchain node plus additional services required for reliable messaging, including mailboxing and contact management.

## Prerequisites

[Node](https://nodejs.org/en/) v8+ with [npm](https://www.npmjs.com/).

## Installation

```sh
npm install --global onyx-server
```

## Usage

### CLI

```sh
onyx-server --port 5000 --http-url http://localhost:8500 --ws-url ws://localhost:8546
```

All arguments are optional, when not provided the server will use environment
variables `ONYX_PORT`, `SWARM_HTTP_URL` and `SWARM_WS_URL` or its defaults
(WebSocket on `ws://localhost:8546`, HTTP on `http://localhost:8500` and port
5000).

Additionally you can pass `-u` or `--unsecure` to dismiss using tls, only recommended
for when connecting client and server over a local connection

The `DEBUG` environment variable can be used to activate logs, ex:

```sh
DEBUG="onyx*" onyx-server
```

### Setting up a Mainframe Node on AWS

You can use a pre-built [AMI](https://en.wikipedia.org/wiki/Amazon_Machine_Image)
to conveniently set up a Mainframe node on AWS.

To do it, make sure you have an AWS account and your AWS CLI is configured to
use the `eu-west-1` (Ireland) region as default. We're going to assume you have a
[VPC](https://eu-west-1.console.aws.amazon.com/vpc/home?region=eu-west-1#)
configured in that region.

Aside from a VPC and an Internet Gateway, the
[Route Table](https://eu-west-1.console.aws.amazon.com/vpc/home?region=eu-west-1#routetables:)
has to be configured for this VPC, with routes set like these:

| Destination | Target                      | Status | Propagated |
| ---         | ----                        | ---    | ---        |
| 10.0.0.0/16 | local                       | Active | No         |
| 0.0.0.0/0   | \<INTERNET GATEWAY ID HERE> | Active | No         |

#### 1. Create a security group for your Onyx Server

Go to [security group management](https://eu-west-1.console.aws.amazon.com/ec2/v2/home?region=eu-west-1#SecurityGroups:sort=groupId)
in the AWS dashboard and create a new security group. Make sure you're creating
it in the right vpc. Set the following group rules:

**Inbound**

| Type            | Protocol | Port Range | Source    | Description                  |
| ---             | ---      |        --- | ---       | ---                          |
| SSH (22)        | TCP      |         22 | 0.0.0.0/0 | SSH                          |
| Custom TCP Rule | TCP      |      30399 | 0.0.0.0/0 | swarm TCP                    |
| Custom TCP Rule | TCP      |       5000 | 0.0.0.0/0 | Mailboxing service interface |
| Custom UDP Rule | UDP      |      30399 | 0.0.0.0/0 | swarm UDP                    |
| Custom TCP Rule | TCP      |       5002 | 0.0.0.0/0 | cert endpoint                |

**Outbound**

| Type        | Protocol | Port Range | Source    | Description |
| ---         | ---      | ---        | ---       | ---         |
| ALL Traffic | ALL      | ALL        | 0.0.0.0/0 | ALL Traffic |

#### 2. Create a subnet for your Mainframe node

Go to [subnet management](https://eu-west-1.console.aws.amazon.com/vpc/home?region=eu-west-1#subnets:)
in the AWS dashboard and create a new subnet in your VPC. Make sure it's within
the vpc CIDR range. For example if the VPC CIDR is `10.0.0.0/16`, the sg
IPv4 CIDR block can be `10.0.1.0/24`.

#### 3. Create an SSH key
You're going to use it to connect to the Mainframe Node EC2 node.

```bash
$ mkdir ~/ssh
$ aws ec2 create-key-pair --key-name my_key --output text --query KeyMaterial > ~/ssh/my_key.pem
$ chmod 400 ~/ssh/my_key.pem
```

#### 4. Launch the Mainframe Node

Make sure you have [AWS CLI](https://aws.amazon.com/cli/) installed and configured.
In terminal, run the following command:

Find your security group and subnet ids, which should be something like `sg-XXXXXXXX`
and `subnet-XXXXXXXX`, respectively. Use them in the following command

```bash
$ aws ec2 run-instances \
    --image-id ami-1a066763 \
    --instance-type t2.micro \
    --key-name my_key \
    --security-group-ids <SG ID HERE> \
    --subnet-id <SUBNET ID HERE> \
    --tag-specification "ResourceType=instance,Tags=[{Key=Name,Value=my_onyx_node}]" \
    --associate-public-ip-address
```

This will launch your personal Mainframe node. It will generate an
account for you.

#### 5. Fetch the certificates from the node

In order to connect to the server, the client will need to use the right
certificates - otherwise the connection will be rejected. They are generated on
the server and you need to fetch them first.

Find the public IP of the node you created
[here](https://eu-west-1.console.aws.amazon.com/ec2/v2/home?region=eu-west-1#Instances:sort=instanceId)
and copy the relevant files from it:

```bash
$ scp -i ~/ssh/my_key.pem ubuntu@<NODE PUBLIC IP HERE>:"~/certs/ca-crt.pem ~/certs/client-crt.pem ~/certs/client-key.pem" .
```

#### 6. Connect to your Mainframe node

Launch Onyx and as the `Onyx server websocket url` use
`wss://<NODE PUBLIC IP HERE>:5000/graphql`. When prompted for the certificates
use the one you downloaded in the previous step.

You're connected!

### Development

To build local version run `yarn start`. Afterwards you can start the built server
from `./bin/onyx-server`.

A Mainframe node depends on having a local swarm node running. You can start it by running
the `start_swarm_node.sh` script. This should allow you to run `onyx-server` with
no special arguments.

in one shell:
```sh
./start_swarm_node.sh <some_swarm_data_directory_here>
```

in another shell:
```sh
yarn start
./bin/onyx-server
```

### API

```js
import Conf from 'conf'
import startServer from 'onyx-server'

startServer({
  httpUrl: 'http://localhost:8500',
  wsUrl: 'ws://localhost:8546',
  port: 5000,
  store: new Conf(),
}).then(
  server => {
    console.log('server started')
  },
  err => {
    console.log('failed to start server', err)
  },
)
```

All parameters are optional, fallback values will be used for the parameters not
provided.

## License

MIT.\
See [LICENSE](LICENSE) file.
