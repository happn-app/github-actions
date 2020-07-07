FROM google/cloud-sdk:latest

RUN apt-get update && \
    apt-get install -y apt-transport-https curl lsb-release gnupg jq bash

RUN DISTRO="$(lsb_release -s -c)" ; \
    VERSION="node_12.x" ; \
    curl -sSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - && \
    echo "deb https://deb.nodesource.com/$VERSION $DISTRO main" > /etc/apt/sources.list.d/nodesource.list && \
    echo "deb-src https://deb.nodesource.com/$VERSION $DISTRO main" >> /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs

RUN npm config set unsafe-perm true
RUN npm i -g npm wrangler
RUN curl -L https://storage.googleapis.com/berglas/master/linux_amd64/berglas -o /usr/local/bin/berglas
RUN chmod +x /usr/local/bin/berglas

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]
