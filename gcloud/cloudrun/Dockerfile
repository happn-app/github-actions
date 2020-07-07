FROM google/cloud-sdk:alpine
RUN apk --no-cache add jq curl
RUN gcloud components install beta --quiet

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]