FROM ubuntu:22.04

WORKDIR /app

RUN apt-get update && apt-get install -y \
  build-essential \
  cmake \
  git \
  && rm -rf /var/lib/apt/lists/*

COPY . .

RUN cmake -S . -B build && \
  cmake --build build

EXPOSE 5000
CMD ["./build/collage-alarm"]