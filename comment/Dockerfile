FROM alpine:3.10

RUN apk --no-cache add jq bash curl
RUN npm i -g now

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]