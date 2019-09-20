FROM alpine:3.10

RUN apk --no-cache add jq bash curl

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]