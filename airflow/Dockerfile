FROM quay.io/astronomer/astro-runtime:12.9.0

USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-client \
    && apt-get clean
USER astro
