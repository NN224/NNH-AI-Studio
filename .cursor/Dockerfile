# Base for Cursor background agents (Ubuntu 24.04)
FROM ubuntu:24.04

ARG USER=ubuntu
ARG UID=1000
ARG GID=1000

ENV DEBIAN_FRONTEND=noninteractive
ENV HOME=/home/${USER}

# 1) تحديث وتثبيت الأدوات الأساسية (كمستخدم root)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     sudo curl ca-certificates gnupg git build-essential python3 python3-dev python3-pip \
     pkg-config libglib2.0-0 libvips-dev libvips-tools openssh-client \
  && rm -rf /var/lib/apt/lists/*

# 2) Node.js 20 (Nodesource) + npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# 3) pnpm (via corepack or global install)
RUN npm i -g pnpm@8 || true

# 4) Create non-root user and give passwordless sudo (for agent tasks)
RUN groupadd --gid ${GID} ${USER} || true \
  && useradd --uid ${UID} --gid ${GID} --create-home --shell /bin/bash ${USER} \
  && echo "${USER} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USER} \
  && chmod 0440 /etc/sudoers.d/${USER}

# 5) Switch to non-root user and set workspace
USER ${USER}
WORKDIR /home/${USER}/workspace

# 6) Sanity checks (run as non-root)
RUN node -v || true && pnpm -v || true && python3 --version || true

# 7) By design we do NOT clone the repo here — the agent will clone it later.
# Keep the image minimal to speed snapshotting.