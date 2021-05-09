#FROM node:14
FROM node:12
#FROM alpine:3.8

#RUN apk update && apk add \
#	vim \
#	curl
#RUN apk add  --no-cache --repository \
#	http://dl-cdn.alpinelinux.org/alpine/v3.10/main/ nodejs

ARG MAC_OPTIONS='XX:XX:XX:XX:XX:XX --express-port 3000'
#ARG MAC_OPTIONS='XX:XX:XX:XX:XX:XX'
ENV MAC_OPTIONS=${MAC_OPTIONS}

EXPOSE 3000

WORKDIR /usr/src/app

# Install 
# OPTION A - Published version
#RUN npm  install https://github.com/binsentsu/am43-ctrl

# OPTION A - DEV version
#COPY . .
#RUN npm link am43-ctrl
#WORKDIR /usr/src/app/node_modules/.bin/
COPY package*.json ./

#RUN npm ci --only=production
RUN npm install

COPY . .

# Verify installed and contained in path
RUN which node

#RUN ls -latr /usr/src/app

#RUN which am43ctrl

#ARG ARG_MAC="02:67:9a:c5:59:55 02:5f:10:2f:ef:54 02:91:67:e6:ca:0d -d -f 10 --url mqtts://rentonhomdom.duckdns.org -u user01 -p U3tEP8nHuEX --topic am43ctrl"

ARG ARG_MAC="02:91:67:e6:ca:0d -d -f 10 --url mqtts://rentonhomdom.duckdns.org -u user01 -p U3tEP8nHuEX --topic am43ctrl"
ENV ENV_MAC="${ARG_MAC}"



# Build a shell script because the ENTRYPOINT command doesn't like using ENV
#RUN echo "#!/bin/bash \n /usr/local/bin/node am43ctrl $MAC" > ./entrypoint.sh
RUN echo "#!/bin/bash \n head -n 10 ./entrypoint.sh \n echo MAC=\"$MAC\"" > ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Run the generated shell script.
#ENTRYPOINT ["./entrypoint.sh"]
#ENTRYPOINT  /usr/local/bin/node ./am43ctrl ${ENV_MAC}
#CMD [ "node", "index.js", "02:91:67:e6:ca:0d -d -f 10 --url mqtts://rentonhomdom.duckdns.org -u user01 -p U3tEP8nHuEX --topic am43ctrl" ]

RUN \
  apt-get update && \
  apt-get install jq libudev-dev -y

RUN \
  chmod +x run.sh

CMD [ "./run.sh" ]

# ports and volumes
VOLUME /config

