FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    libjsoncpp-dev \
    libpodofo-dev \
    qpdf \
    libboost-all-dev \
    zlib1g-dev \
    uuid-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Build Drogon WITH HTTP upload support enabled
RUN git clone --recurse-submodules https://github.com/drogonframework/drogon.git /tmp/drogon && \
    cd /tmp/drogon && \
    mkdir build && cd build && \
    cmake .. \
      -DCMAKE_BUILD_TYPE=Release \
      -DDROGON_ENABLE_HTTP_UPLOAD=ON && \
    make -j$(nproc) && \
    make install && \
    ldconfig && \
    rm -rf /tmp/drogon

# Build your application
WORKDIR /app
COPY . .

RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

EXPOSE 8080
CMD ["./build/pdf_editor_api"]
