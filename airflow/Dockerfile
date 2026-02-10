FROM astrocrpublic.azurecr.io/runtime:3.1-12

USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-client \
    && apt-get clean
USER astro
