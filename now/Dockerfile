FROM alpine:3.10

RUN apk --no-cache add jq bash curl nodejs npm
RUN npm config set unsafe-perm true
RUN npm i -g now

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]
