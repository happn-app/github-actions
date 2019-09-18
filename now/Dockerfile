FROM alpine

RUN apk --no-cache add jq bash curl now

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]