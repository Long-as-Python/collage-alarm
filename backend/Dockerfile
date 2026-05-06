FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Kyiv

WORKDIR /app

RUN apt-get update && apt-get install -y \
  alsa-utils \
  build-essential \
  cmake \
  curl \
  ffmpeg \
  git \
  pulseaudio-utils \
  sound-theme-freedesktop \
  tzdata \
  && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
  && rm -rf /var/lib/apt/lists/*

COPY . .

RUN cmake -S . -B build && \
  cmake --build build

EXPOSE 4000
CMD ["./build/collage-alarm"]
