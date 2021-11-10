FROM alpine:3.13

LABEL "name"="chart-releaser"

ARG HELM_VERSION=v3.7.1
ENV HELM_HOME=/usr/local/helm

RUN apk -v --update --no-cache add \
  -X http://dl-cdn.alpinelinux.org/alpine/edge/testing  \
  hub \
  git \
  ca-certificates \
  curl \
  bash

RUN wget -q https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz -O - | tar -xzO linux-amd64/helm > /usr/local/bin/helm && \
  chmod +x /usr/local/bin/helm

COPY "entrypoint.sh" "/entrypoint.sh"
COPY "cleanup.sh" "/cleanup.sh"
ENTRYPOINT ["/entrypoint.sh"]
