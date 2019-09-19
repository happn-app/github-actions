FROM alpine:3.10

RUN apk --no-cache add jq bash curl nodejs npm alpine-sdk python

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]
