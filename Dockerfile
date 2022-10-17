FROM --platform=${TARGETPLATFORM:-linux/amd64} ghcr.io/openfaas/of-watchdog:0.8.4 as watchdog
FROM --platform=${TARGETPLATFORM:-linux/amd64} node:18.9.0-alpine3.16 as ship

ARG TARGETPLATFORM
ARG BUILDPLATFORM

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

RUN apk --no-cache add curl ca-certificates \
    && addgroup -S app && adduser -S -g app app

# Turn down the verbosity to default level.
ENV NPM_CONFIG_LOGLEVEL warn

RUN chmod 777 /tmp

USER app

RUN mkdir -p /home/app/function

# Wrapper/boot-strapper
WORKDIR /home/app
COPY package.json ./

# This ordering means the npm installation is cached for the outer function handler.
RUN npm i

# Copy outer function handler
COPY index.js ./
COPY sentry.js ./
COPY utils.js ./
COPY winston/ ./winston

# COPY function node packages and install, adding this as a separate
# entry allows caching of npm install

WORKDIR /home/app/function
COPY function/*.json ./

RUN npm i

# COPY function files and folders
COPY function/ ./

# Run any tests that may be available
# RUN npm test

# Set correct permissions to use non root user
WORKDIR /home/app/

ENV cgi_headers="true"
ENV fprocess="node index.js"
ENV mode="http"
ENV upstream_url="http://localhost:3000"
# ENV upstream_url="https://tec-digital-konecta-dev.technisys.net/api/faas/function/poc-ec-diners-konecta"

ENV exec_timeout="1m"
ENV write_timeout="10s"
ENV read_timeout="15s"
ENV handler_wait_duration="5m"
ENV healthcheck_interval="1m"
ENV upstream_timeout="5m"

ENV prefix_logs="false"

HEALTHCHECK --interval=15s CMD [ -e /tmp/.lock ] || exit 1

CMD ["fwatchdog"]
