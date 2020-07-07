FROM google/cloud-sdk:latest

RUN apt-get update && \
    apt-get install -y apt-transport-https curl lsb-release gnupg jq bash

RUN curl -L https://storage.googleapis.com/berglas/master/linux_amd64/berglas -o /usr/local/bin/berglas
RUN chmod +x /usr/local/bin/berglas

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]
