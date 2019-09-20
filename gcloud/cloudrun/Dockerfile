FROM google/cloud-sdk:alpine

RUN apk --no-cache add jq bash curl

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]