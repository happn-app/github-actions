FROM google/cloud-sdk:latest

RUN apt-get update && apt-get install -y jq bash curl nodejs npm
RUN npm config set unsafe-perm true
RUN npm i -g now

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]
