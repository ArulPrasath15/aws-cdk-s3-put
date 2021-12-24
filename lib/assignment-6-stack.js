const { Stack, Duration } = require("aws-cdk-lib");
const { InstanceClass } = require("aws-cdk-lib/aws-ec2");
const AWS = require("aws-sdk");
var ec2 = new AWS.EC2();
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const ObjectsToCsv = require("objects-to-csv");
let today = new Date();

const today_date =
    today.getMonth() + "-" + today.getFullYear() + "-" + today.getDate();
const time_now =
    today_date +
    "-" +
    today.getHours() +
    "." +
    today.getMinutes() +
    "." +
    today.getSeconds();

class Assignment6Stack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        var params = {
            Filters: [{
                    Name: "instance-type",
                    Values: ["t2.micro"],
                },
                {
                    Name: "instance-state-name",
                    Values: ["running"],
                },
            ],
        };

        var instances_data = [];
        ec2.describeInstances(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
            } else {
                data.Reservations.forEach((instance) => {
                    var instance_data = instance.Instances[0];
                    var instance_volume_data = [];
                    instance_data.BlockDeviceMappings.forEach((ebs_vol) => {
                        instance_volume_data.push(ebs_vol.Ebs.VolumeId);
                    });

                    var instance_name = "";
                    instance_data.Tags.forEach((tag) => {
                        if (tag.Key == "Name") {
                            console.log(tag.Value);
                            instance_name = tag.Value;
                        }
                    });

                    instances_data.push({
                        instance_name: instance_name,
                        instance_id: instance_data.InstanceId,
                        attaches_volumes: instance_volume_data.join(","),
                        created_time: instance_data.LaunchTime.toString(),
                        instance_state: instance_data.State.Name,
                    });
                });
            }
            const csv = new ObjectsToCsv(instances_data);
            csv.toDisk(`./output/ec2_running_instances_${today_date}.csv`);
        });

        const lifecycleRule = [{
            enabled: true,
            expiration: Duration.days(30),
        }, ];

        var bucket_name = "arul-presidio-training-" + time_now;
        const bucket = new s3.Bucket(this, bucket_name, {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            lifecycleRules: lifecycleRule,
            bucketName: bucket_name,
            versioned: true,
        });

        new s3deploy.BucketDeployment(this, "uploadData", {
            sources: [s3deploy.Source.asset("./output")],
            destinationBucket: bucket,
        });
    }
}

module.exports = { Assignment6Stack };