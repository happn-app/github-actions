FROM google/cloud-sdk:latest

RUN apt-get update && apt-get install -y jq bash curl nodejs npm
RUN npm config set unsafe-perm true
RUN npm i -g npm now
RUN curl -L https://storage.googleapis.com/berglas/master/linux_amd64/berglas -o /usr/local/bin/berglas
RUN chmod +x /usr/local/bin/berglas

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]
