## Collection of `Github actions` workflows

**Directory structure:**
* [gcloud](gcloud): opinionated workflows to deploy various resources on GCP
  * [cloudrun](gcloud/cloudrun): `Cloudrun` workflow
  * [pubsub](gcloud/pubsub): `Pub/sub` workflow
* [now](now): workflow to deploy on `Zeit/Now`
* [remote-testing](remote-testing): workflow to launch a remote `npm test`
* [comment](comment): workflow to add a comment on a `github` repository

Each workflow must be written in YAML and have a `.yml` extension. They also need a corresponding `README.md` file to explain their purpose.