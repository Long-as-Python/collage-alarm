FROM ubuntu:22.04

WORKDIR /app

RUN apt-get update && apt-get install -y \
  alsa-utils \
  build-essential \
  cmake \
  git \
  pulseaudio-utils \
  sound-theme-freedesktop \
  && rm -rf /var/lib/apt/lists/*

COPY . .

RUN cmake -S . -B build && \
  cmake --build build

EXPOSE 4000
CMD ["./build/collage-alarm"]
